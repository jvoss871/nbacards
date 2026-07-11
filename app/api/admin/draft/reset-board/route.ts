import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE /api/admin/draft/reset-board
// Body: { year?: number }
// Wipes draft_picks, draft_boards, and draft_results for the given year.
export async function DELETE(req: Request) {
  const { year = DRAFT_YEAR } = await req.json().catch(() => ({}))

  // Must delete picks before boards (FK constraint)
  const { data: boards } = await sb
    .from('draft_boards')
    .select('id')
    .eq('year', year)

  if (boards?.length) {
    const ids = boards.map(b => b.id)
    await sb.from('draft_picks').delete().in('board_id', ids)
  }

  const [boardsRes, resultsRes] = await Promise.all([
    sb.from('draft_boards').delete().eq('year', year),
    sb.from('draft_results').delete().eq('year', year),
  ])

  if (boardsRes.error) return NextResponse.json({ error: boardsRes.error.message }, { status: 500 })
  if (resultsRes.error) return NextResponse.json({ error: resultsRes.error.message }, { status: 500 })

  return NextResponse.json({ ok: true, year })
}
