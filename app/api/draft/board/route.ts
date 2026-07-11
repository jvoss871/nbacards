import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { USER_ID } from '@/lib/supabase'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const year = Number(new URL(req.url).searchParams.get('year') ?? DRAFT_YEAR)

  // Get or create board
  let { data: board } = await sb
    .from('draft_boards')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('year', year)
    .single()

  if (!board) {
    const { data: created } = await sb
      .from('draft_boards')
      .insert({ user_id: USER_ID, year, status: 'open' })
      .select()
      .single()
    board = created
  }

  // Get picks with prospect info
  const { data: picks } = await sb
    .from('draft_picks')
    .select('slot, prospect_id, prospect:draft_prospects(id, name, position, school, projected_min, projected_max)')
    .eq('board_id', board.id)
    .order('slot')

  // Always fetch results so team badges show before scoring
  const { data: results } = await sb
    .from('draft_results')
    .select('slot, prospect_id, prospect_name, team_abbr, team_name')
    .eq('year', year)

  return NextResponse.json({ board, picks: picks ?? [], results: results ?? [] })
}
