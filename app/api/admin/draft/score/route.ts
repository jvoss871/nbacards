import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcDraftCredits, DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/draft/score
// Body: { year?: number }
// Requires a valid Supabase Bearer token in the Authorization header.
// Run this after inserting all draft_results rows in Supabase.
// Scores every locked board and credits users.
export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { year = DRAFT_YEAR } = await req.json().catch(() => ({}))

  // Load results — keyed by slot → prospect_name (lowercase trimmed for fuzzy match)
  const { data: results, error: rErr } = await sb
    .from('draft_results')
    .select('slot, prospect_name')
    .eq('year', year)

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
  if (!results?.length) return NextResponse.json({ error: 'no results for this year' }, { status: 400 })

  const resultMap = Object.fromEntries(
    results.map(r => [r.slot, r.prospect_name?.trim().toLowerCase() ?? ''])
  )

  // Load all locked (unscored) boards
  const { data: boards, error: bErr } = await sb
    .from('draft_boards')
    .select('id, user_id')
    .eq('year', year)
    .eq('status', 'locked')

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })
  if (!boards?.length) return NextResponse.json({ scored: 0, message: 'no locked boards' })

  // One query for every board's picks instead of one query per board
  const boardIds = boards.map(b => b.id)
  const { data: allPicks, error: pErr } = await sb
    .from('draft_picks')
    .select('board_id, slot, prospect:draft_prospects(name)')
    .in('board_id', boardIds)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const picksByBoard = new Map<string, { slot: number; prospect: { name: string } | null }[]>()
  for (const pick of allPicks ?? []) {
    const list = picksByBoard.get(pick.board_id as string) ?? []
    list.push(pick as unknown as { slot: number; prospect: { name: string } | null })
    picksByBoard.set(pick.board_id as string, list)
  }

  const scoredAt = new Date().toISOString()
  // user_id/year are required (NOT NULL) columns — upsert's insert branch still
  // validates them even though every one of these ids already exists and will
  // just hit the conflict path, so they must be included alongside the changes.
  const boardRows: { id: string; user_id: string; year: number; status: string; correct_picks: number; credits_earned: number; scored_at: string }[] = []
  const creditsByUser = new Map<string, number>()

  for (const board of boards) {
    const picks = picksByBoard.get(board.id) ?? []
    const correct = picks.filter(p => {
      const name = p.prospect?.name?.trim().toLowerCase() ?? ''
      return name && resultMap[p.slot] === name
    }).length
    const credits = calcDraftCredits(correct)

    boardRows.push({ id: board.id, user_id: board.user_id, year, status: 'scored', correct_picks: correct, credits_earned: credits, scored_at: scoredAt })
    if (credits > 0) creditsByUser.set(board.user_id, credits)
  }

  const { error: boardUpdateErr } = await sb.from('draft_boards').upsert(boardRows, { onConflict: 'id' })
  if (boardUpdateErr) return NextResponse.json({ error: boardUpdateErr.message }, { status: 500 })

  if (creditsByUser.size > 0) {
    const userIds = [...creditsByUser.keys()]
    const { data: states, error: stateErr } = await sb
      .from('user_state')
      .select('user_id, credits')
      .in('user_id', userIds)

    if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 })

    const creditRows = (states ?? []).map(s => ({
      user_id: s.user_id as string,
      credits: (s.credits as number) + (creditsByUser.get(s.user_id as string) ?? 0),
    }))

    const { error: creditUpdateErr } = await sb.from('user_state').upsert(creditRows, { onConflict: 'user_id' })
    if (creditUpdateErr) return NextResponse.json({ error: creditUpdateErr.message }, { status: 500 })
  }

  return NextResponse.json({ scored: boards.length, year })
}
