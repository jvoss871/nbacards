import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYOUTS } from '@/lib/trivia-logic'

const USER_ID = 'default'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/trivia/safety-net
// Body: { session_id, action_card_id }
// Locks the current step's payout as the floor and marks the action card used.
export async function POST(req: Request) {
  const { session_id, action_card_id } = await req.json()
  const sb = serviceClient()

  const { data: session } = await sb
    .from('trivia_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', USER_ID)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 })

  const newFloor = PAYOUTS[session.current_step] ?? 0

  if (newFloor <= (session.credits_floor ?? 0)) {
    return NextResponse.json({ error: 'Floor already at or above this level' }, { status: 400 })
  }

  await sb
    .from('trivia_sessions')
    .update({ credits_floor: newFloor })
    .eq('id', session_id)

  // Award the floor amount if it exceeds what was already awarded
  const topUp = newFloor - (session.credits_floor ?? 0)
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

  // Mark action card used — only proceeds if the card was still unused (prevents replay)
  const { data: updatedCards } = await sb
    .from('user_action_cards')
    .update({ used: true })
    .eq('id', action_card_id)
    .eq('user_id', USER_ID)
    .eq('used', false)
    .select('id')

  if (!updatedCards || updatedCards.length < 1) {
    return NextResponse.json({ error: 'Action card already used' }, { status: 400 })
  }

  return NextResponse.json({ new_floor: newFloor, credits_awarded: topUp })
}
