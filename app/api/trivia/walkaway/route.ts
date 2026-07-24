import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYOUTS } from '@/lib/trivia-logic'
import { getUserId } from '@/lib/get-user-id'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/trivia/walkaway  body: { session_id }
export async function POST(req: Request) {
  const USER_ID = await getUserId(req)
  if (!USER_ID) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { session_id } = await req.json()
  const sb = serviceClient()

  const { data: session } = await sb
    .from('trivia_sessions')
    .select('id, status, current_step, credits_floor')
    .eq('id', session_id)
    .eq('user_id', USER_ID)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 })

  const total  = PAYOUTS[session.current_step] ?? 0
  // Only award credits above what was already paid at safety-net steps
  const topUp  = Math.max(0, total - (session.credits_floor ?? 0))

  await sb
    .from('trivia_sessions')
    .update({ status: 'walked_away', credits_floor: total })
    .eq('id', session_id)

  if (topUp > 0) {
    const { data: state } = await sb
      .from('user_state')
      .select('credits')
      .eq('user_id', USER_ID)
      .single()
    if (state) {
      await sb
        .from('user_state')
        .update({ credits: state.credits + topUp })
        .eq('user_id', USER_ID)
    }
  }

  const { data: finalState } = await sb.from('user_state').select('credits').eq('user_id', USER_ID).single()

  return NextResponse.json({ earned: total, topUp, credits: finalState?.credits ?? null })
}
