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

  let scored = 0

  for (const board of boards) {
    const { data: picks } = await sb
      .from('draft_picks')
      .select('slot, prospect:draft_prospects(name)')
      .eq('board_id', board.id)

    const correct = (picks ?? []).filter(p => {
      const prospect = p.prospect as unknown as { name: string } | null
      const name = prospect?.name?.trim().toLowerCase() ?? ''
      return name && resultMap[p.slot] === name
    }).length
    const credits = calcDraftCredits(correct)

    await sb
      .from('draft_boards')
      .update({ status: 'scored', correct_picks: correct, credits_earned: credits, scored_at: new Date().toISOString() })
      .eq('id', board.id)

    if (credits > 0) {
      await sb.rpc('increment_credits', { p_user_id: board.user_id, p_amount: credits })
    }

    scored++
  }

  return NextResponse.json({ scored, year })
}
