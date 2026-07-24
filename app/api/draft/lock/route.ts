import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { year = DRAFT_YEAR } = await req.json()

  const { data: board } = await sb
    .from('draft_boards')
    .select('id, status')
    .eq('user_id', userId)
    .eq('year', year)
    .single()

  if (!board) return NextResponse.json({ error: 'no board' }, { status: 404 })
  if (board.status !== 'open') return NextResponse.json({ error: 'already locked' }, { status: 400 })

  const { error } = await sb
    .from('draft_boards')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .eq('id', board.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
