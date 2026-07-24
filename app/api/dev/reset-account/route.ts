import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

const STARTING_CREDITS = 200

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: Request) {
  const USER_ID = await getUserId(req)
  if (!USER_ID) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = sb()
  await Promise.all([
    client.from('user_cards').delete().eq('user_id', USER_ID),
    client.from('user_legends').delete().eq('user_id', USER_ID),
    client.from('predictions').delete().eq('user_id', USER_ID),
    client.from('trivia_sessions').delete().eq('user_id', USER_ID),
    client.from('user_action_cards').delete().eq('user_id', USER_ID),
    client.from('user_onboarding_seen').delete().eq('user_id', USER_ID),
  ])
  await client
    .from('user_state')
    .update({ credits: STARTING_CREDITS, prestige_level: 0 })
    .eq('user_id', USER_ID)
  return NextResponse.json({ ok: true })
}
