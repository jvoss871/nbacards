import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USER_ID = 'default'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST() {
  const today = new Date().toISOString().split('T')[0]
  // Soft-delete: keep question_ids in DB so they stay in usedIds for the next session draw
  await sb().from('trivia_sessions').update({ status: 'reset' }).eq('user_id', USER_ID).eq('session_date', today)
  return NextResponse.json({ ok: true })
}
