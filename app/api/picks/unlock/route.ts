import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/picks/unlock
// Body: { game_ids: string[] }
// Deletes the caller's own pending predictions for the given games. Any consumed
// insurance/double-down action card is not restored — matches prior behavior.
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { game_ids } = await req.json() as { game_ids: string[] }
  if (!Array.isArray(game_ids) || game_ids.length === 0) {
    return NextResponse.json({ error: 'game_ids array required' }, { status: 400 })
  }

  const sb = serviceClient()
  const { error } = await sb
    .from('predictions')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'pending')
    .in('game_id', game_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
