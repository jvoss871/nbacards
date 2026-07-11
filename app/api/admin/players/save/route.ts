import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  for (const { id, tier, in_pool } of updates) {
    await sb
      .from('players')
      .update({ tier, in_pool, multiplier: MULTIPLIERS[tier] ?? 1.0 })
      .eq('id', id)
  }

  return NextResponse.json({ ok: true, count: updates.length })
}
