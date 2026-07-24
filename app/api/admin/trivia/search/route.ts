import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/trivia/search?q=durant&category=awards&difficulty=3
// q is optional as long as category and/or difficulty is set, so a category
// can be browsed in full without needing search text.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const q = params.get('q')?.trim() ?? ''
  const category = params.get('category') ?? ''
  const difficulty = params.get('difficulty') ?? ''

  if (q.length < 2 && !category && !difficulty) return NextResponse.json([])

  let query = sb()
    .from('trivia_questions')
    .select('id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category')
    .limit(50)

  if (q.length >= 2) query = query.ilike('question', `%${q}%`)
  if (category) query = query.eq('category', category)
  if (difficulty) query = query.eq('difficulty', difficulty)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
