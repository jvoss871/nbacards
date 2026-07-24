import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserId } from '@/lib/get-user-id'
import { DRAFT_YEAR } from '@/lib/draft-logic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = Number(new URL(req.url).searchParams.get('year') ?? DRAFT_YEAR)

  // Get or create board
  let { data: board } = await sb
    .from('draft_boards')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .single()

  if (!board) {
    const { data: created } = await sb
      .from('draft_boards')
      .insert({ user_id: userId, year, status: 'open' })
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
