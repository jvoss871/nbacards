import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/trivia/flag
// Body: { question_id, reason }
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, reason } = await req.json() as { question_id: string; reason: string }
  if (!question_id) return NextResponse.json({ error: 'question_id required' }, { status: 400 })

  const client = sb()

  // Fetch the question snapshot at flag time
  const { data: q } = await client
    .from('trivia_questions')
    .select('id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category')
    .eq('id', question_id)
    .single()

  if (!q) return NextResponse.json({ error: 'question not found' }, { status: 404 })

  const { error } = await client.from('question_flags').insert({
    question_id,
    user_id: userId,
    reason: reason ?? '',
    question_snapshot: q,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
