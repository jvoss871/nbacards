import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { todayET } from '@/lib/time'
import { getUserId } from '@/lib/get-user-id'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request) {
  const USER_ID = await getUserId(req)
  if (!USER_ID) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = todayET()
  // Soft-delete: keep question_ids in DB so they stay in usedIds for the next session draw
  await sb().from('trivia_sessions').update({ status: 'reset' }).eq('user_id', USER_ID).eq('session_date', today)
  return NextResponse.json({ ok: true })
}
