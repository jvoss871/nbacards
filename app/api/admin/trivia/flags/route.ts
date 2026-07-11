import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/trivia/flags?status=pending
export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get('status') ?? 'pending'
  const { data, error } = await sb()
    .from('question_flags')
    .select('id, question_id, user_id, reason, question_snapshot, status, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// PATCH /api/admin/trivia/flags — update flag status
// Body: { id: string; status: 'dismissed' | 'fixed' }
export async function PATCH(req: Request) {
  const { id, status } = await req.json() as { id: string; status: string }
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  const { error } = await sb().from('question_flags').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
