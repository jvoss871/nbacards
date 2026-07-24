import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

export async function POST(req: Request) {
  const USER_ID = await getUserId(req)
  if (!USER_ID) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().slice(0, 10)

  // Delete all predictions for a clean slate
  const { error: predsErr } = await sb
    .from('predictions')
    .delete()
    .eq('user_id', USER_ID)

  if (predsErr) return NextResponse.json({ error: predsErr.message }, { status: 500 })

  // Reset all games to today's date + scheduled
  const { error: gamesErr } = await sb
    .from('games')
    .update({
      game_date:  today,
      status:     'scheduled',
      winner:     null,
      home_score: null,
      away_score: null,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (gamesErr) return NextResponse.json({ error: gamesErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
