import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// PATCH /api/admin/trivia/fix
// Body: { id: string; correct_answer?: string; question?: string; option_a?: string; option_b?: string; option_c?: string; option_d?: string }
export async function PATCH(req: Request) {
  const body = await req.json() as { id: string; [key: string]: string }
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['correct_answer', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'category']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(update).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const { error } = await sb().from('trivia_questions').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/trivia/fix
// Body: { id: string }
export async function DELETE(req: Request) {
  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await sb().from('trivia_questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
