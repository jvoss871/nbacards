import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { phoneHint } from '@/lib/trivia-logic'
import type { Tier } from '@/lib/types'
import { getUserId } from '@/lib/get-user-id'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/trivia/lifeline
// Body: { session_id, lifeline: 'fifty' | 'phone' | 'audience', player_id?: string }
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id, lifeline, player_id } = await req.json()
  const sb = serviceClient()

  const { data: session } = await sb
    .from('trivia_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', userId)
    .single()

  if (!session || session.status !== 'active') {
    return NextResponse.json({ error: 'Session not active' }, { status: 400 })
  }

  const step = session.current_step + 1
  const questionId = session.question_ids[step - 1]
  const { data: question } = await sb
    .from('trivia_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  if (lifeline === 'fifty') {
    if (session.lifeline_fifty_used) return NextResponse.json({ error: 'Already used' }, { status: 400 })

    // Eliminate two wrong answers, keep correct + one random wrong
    const wrong = (['a', 'b', 'c', 'd'] as const).filter(o => o !== question.correct_answer)
    const keepWrong = wrong[Math.floor(Math.random() * wrong.length)]
    const eliminated = wrong.filter(o => o !== keepWrong)

    await sb.from('trivia_sessions').update({
      lifeline_fifty_used: true,
      eliminated_options:  eliminated,
    }).eq('id', session_id)

    return NextResponse.json({ eliminated })
  }

  if (lifeline === 'phone') {
    if (session.lifeline_phone_used) return NextResponse.json({ error: 'Already used' }, { status: 400 })
    if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

    // Load player card and verify ownership
    const { data: card } = await sb
      .from('user_cards')
      .select('quantity, reliability, player:players(id, name, tier, multiplier)')
      .eq('user_id', userId)
      .eq('player_id', player_id)
      .single()

    if (!card || card.quantity < 1) {
      return NextResponse.json({ error: 'Card not owned' }, { status: 400 })
    }

    const player = (Array.isArray(card.player) ? card.player[0] : card.player) as unknown as { id: string; name: string; tier: Tier; multiplier: number }
    // Load reliability from DB — never trust client-supplied values
    const resolvedReliability: number | null =
      Array.isArray(card.reliability) ? (card.reliability[0] ?? null) : null
    const hint = phoneHint(
      question.correct_answer,
      player.tier,
      ['a', 'b', 'c', 'd'],
      resolvedReliability,
    )

    // Card is only consumed on a wrong answer — just record the player_id for now
    await sb.from('trivia_sessions').update({
      lifeline_phone_used: true,
      phone_player_id:     player_id,
    }).eq('id', session_id)

    return NextResponse.json({ hint, player_name: player.name, player_tier: player.tier })
  }

  if (lifeline === 'audience') {
    if (session.lifeline_audience_used) return NextResponse.json({ error: 'Already used' }, { status: 400 })

    await sb.from('trivia_sessions').update({ lifeline_audience_used: true }).eq('id', session_id)

    return NextResponse.json({
      a: question.audience_a,
      b: question.audience_b,
      c: question.audience_c,
      d: question.audience_d,
    })
  }

  return NextResponse.json({ error: 'Unknown lifeline' }, { status: 400 })
}
