import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USER_ID = 'default'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/trivia/skip
// Body: { session_id, action_card_id }
// Replaces the current question with a fresh draw and marks the action card used.
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

  const currentIdx = session.current_step // 0-based index of current question
  const usedIds: string[] = session.question_ids

  // Match the difficulty of the question being replaced (steps 1-5=easy, 6-10=medium, 11-15=hard)
  const difficulty = currentIdx < 5 ? 1 : currentIdx < 10 ? 2 : 3

  // Pick a replacement of the same difficulty not already in the session
  const { data: candidates } = await sb
    .from('trivia_questions')
    .select('id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, audience_a, audience_b, audience_c, audience_d')
    .eq('difficulty', difficulty)
    .not('id', 'in', `(${usedIds.map(id => `"${id}"`).join(',')})`)
    .limit(20)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ error: 'No replacement questions available' }, { status: 409 })
  }

  const replacement = candidates[Math.floor(Math.random() * candidates.length)]

  // Swap question at current index
  const newIds = [...usedIds]
  newIds[currentIdx] = replacement.id

  await sb
    .from('trivia_sessions')
    .update({ question_ids: newIds })
    .eq('id', session_id)

  // Mark action card used
  await sb
    .from('user_action_cards')
    .update({ used: true })
    .eq('id', action_card_id)
    .eq('user_id', USER_ID)

  return NextResponse.json({ question: replacement })
}
