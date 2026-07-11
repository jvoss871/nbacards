import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/trivia/search?q=durant
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const { data, error } = await sb()
    .from('trivia_questions')
    .select('id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category')
    .ilike('question', `%${q}%`)
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
