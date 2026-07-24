import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/trivia/pending — list misc questions awaiting approval
export async function GET() {
  const { data, error } = await sb()
    .from('trivia_pending_questions')
    .select('id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// PATCH /api/admin/trivia/pending — approve: promote the (possibly-edited) row into
// trivia_questions with default audience values, then remove it from the pending queue.
// Body: { id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category }
export async function PATCH(req: Request) {
  const body = await req.json() as Record<string, unknown>
  const id = body.id as string
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const client = sb()
  const row = {
    question:       body.question,
    option_a:       body.option_a,
    option_b:       body.option_b,
    option_c:       body.option_c,
    option_d:       body.option_d,
    correct_answer: body.correct_answer,
    difficulty:     Number(body.difficulty),
    category:       body.category,
    audience_a: 25, audience_b: 25, audience_c: 25, audience_d: 25,
  }

  const { error: insertError } = await client.from('trivia_questions').insert(row)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const { error: deleteError } = await client.from('trivia_pending_questions').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/trivia/pending — reject: discard the candidate question
// Body: { id }
export async function DELETE(req: Request) {
  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await sb().from('trivia_pending_questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
