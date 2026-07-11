import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAYOUTS, SAFETY_NET_STEPS, floorForStep } from '@/lib/trivia-logic'

const USER_ID = 'default'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/trivia/answer
// Body: { session_id, answer: 'a'|'b'|'c'|'d' }
export async function POST(req: Request) {
  const { session_id, answer } = await req.json()
  const sb = serviceClient()

  const { data: session } = await sb
    .from('trivia_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', USER_ID)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 })

  const nextStep = session.current_step + 1
  if (nextStep > 15) return NextResponse.json({ error: 'Session already complete' }, { status: 400 })

  const questionId = session.question_ids[nextStep - 1]
  const { data: question } = await sb
    .from('trivia_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const correct = answer === question.correct_answer
  const creditsAtStep = PAYOUTS[nextStep]
  const newFloor = SAFETY_NET_STEPS.has(nextStep) && correct ? creditsAtStep : session.credits_floor

  if (correct) {
    const isWon = nextStep === 15
    const { error } = await sb
      .from('trivia_sessions')
      .update({
        current_step:  nextStep,
        credits_floor: newFloor,
        status:        isWon ? 'won' : 'active',
      })
      .eq('id', session_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Award credits if won or if passing a safety net
    if (isWon || SAFETY_NET_STEPS.has(nextStep)) {
      const award = isWon ? PAYOUTS[15] : creditsAtStep
      const { data: state } = await sb
        .from('user_state')
        .select('credits')
        .eq('user_id', USER_ID)
        .single()
      if (state) {
        await sb
          .from('user_state')
          .update({ credits: state.credits + award })
          .eq('user_id', USER_ID)
      }
    }

    return NextResponse.json({
      correct: true,
      step: nextStep,
      credits_banked: creditsAtStep,
      credits_floor: newFloor,
      status: isWon ? 'won' : 'active',
      correct_answer: question.correct_answer,
    })
  } else {
    // Wrong answer — award up to the highest guaranteed floor
    // naturalFloor = what SAFETY_NET_STEPS already deposited into the account
    // guaranteedFloor = max of natural floor and any Safety Net card floor set mid-game
    const naturalFloor = floorForStep(session.current_step)
    const guaranteedFloor = Math.max(naturalFloor, session.credits_floor ?? 0)

    await sb
      .from('trivia_sessions')
      .update({ status: 'lost', credits_floor: guaranteedFloor })
      .eq('id', session_id)

    // Consume the phone card now that the game is lost
    if (session.phone_player_id) {
      const { data: card } = await sb
        .from('user_cards')
        .select('quantity')
        .eq('user_id', USER_ID)
        .eq('player_id', session.phone_player_id)
        .single()
      if (card) {
        if (card.quantity <= 1) {
          await sb.from('user_cards').delete().eq('user_id', USER_ID).eq('player_id', session.phone_player_id)
        } else {
          await sb.from('user_cards').update({ quantity: card.quantity - 1 }).eq('user_id', USER_ID).eq('player_id', session.phone_player_id)
        }
      }
    }

    // Top up to guaranteedFloor — naturalFloor was already deposited via SAFETY_NET_STEPS
    const topUp = Math.max(0, guaranteedFloor - naturalFloor)
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

    return NextResponse.json({
      correct: false,
      step: nextStep,
      credits_earned: topUp,
      credits_floor: guaranteedFloor,
      status: 'lost',
      correct_answer: question.correct_answer,
    })
  }
}
