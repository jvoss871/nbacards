import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/log-event'

const MULTIPLIERS: Record<string, number> = {
  platinum: 2.0, gold: 1.5, silver: 1.25, bronze: 1.1,
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/admin/players/save
// Body: [{ id, tier, in_pool }]
export async function POST(req: Request) {
  const updates: { id: string; tier: string; in_pool: boolean }[] = await req.json()
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'No updates' }, { status: 400 })
  }

  const sb = serviceClient()

  // upsert's insert branch still validates NOT NULL columns even when every one
  // of these ids already exists and will just hit the conflict path — the client
  // only sends tier/in_pool, so the other required columns have to come from
  // the existing rows themselves.
  const ids = updates.map(u => u.id)
  const { data: existing, error: fetchErr } = await sb
    .from('players')
    .select('id, name, team, team_abbr, position')
    .in('id', ids)
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const existingById = new Map((existing ?? []).map(p => [p.id, p]))

  const rows = updates
    .map(({ id, tier, in_pool }) => {
      const base = existingById.get(id)
      if (!base) return null
      return { ...base, tier, in_pool, multiplier: MULTIPLIERS[tier] ?? 1.0 }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const { error: updateErr } = await sb.from('players').upsert(rows, { onConflict: 'id' })
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // A player out of the pool is no longer collectible — anyone already
  // holding his card loses it, rather than keeping an uncounted leftover.
  const outOfPoolIds = updates.filter(u => !u.in_pool).map(u => u.id)
  let cardsRemoved = 0
  if (outOfPoolIds.length > 0) {
    const { data: toRemove } = await sb
      .from('user_cards')
      .select('user_id, player_id')
      .in('player_id', outOfPoolIds)

    const { count } = await sb
      .from('user_cards')
      .delete({ count: 'exact' })
      .in('player_id', outOfPoolIds)
    cardsRemoved = count ?? 0

    for (const row of toRemove ?? []) {
      logEvent(sb, row.user_id, 'card_removed_pool', {
        player_name: existingById.get(row.player_id)?.name ?? row.player_id,
      })
    }
  }

  return NextResponse.json({ ok: true, count: updates.length, cardsRemoved })
}
