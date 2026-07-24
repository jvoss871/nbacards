import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/dev/seed-full-set
// Seeds one card for every in-pool player the user doesn't already own.
// After this, ownedUnique >= totalPlayers and the user can trigger prestige naturally.
export async function POST(req: Request) {
  const USER_ID = await getUserId(req)
  if (!USER_ID) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = sb()

  const [playersRes, ownedRes] = await Promise.all([
    client.from('players').select('id').eq('in_pool', true),
    client.from('user_cards').select('player_id').eq('user_id', USER_ID),
  ])

  const allIds = (playersRes.data ?? []).map((p: { id: string }) => p.id)
  const ownedIds = new Set((ownedRes.data ?? []).map((c: { player_id: string }) => c.player_id))

  const missing = allIds.filter((id: string) => !ownedIds.has(id))

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, added: 0, message: 'Already owns all cards' })
  }

  const rows = missing.map((player_id: string) => ({
    user_id: USER_ID,
    player_id,
    quantity: 1,
    reliability: [75],
  }))

  const { error } = await client.from('user_cards').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, added: missing.length, total: allIds.length })
}
