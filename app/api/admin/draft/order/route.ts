import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEAM_NAMES: Record<string, string> = {
  ATL: 'Atlanta Hawks',    BOS: 'Boston Celtics',    BKN: 'Brooklyn Nets',
  CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls',   CLE: 'Cleveland Cavaliers',
  DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets',   DET: 'Detroit Pistons',
  GSW: 'Golden State Warriors', HOU: 'Houston Rockets', IND: 'Indiana Pacers',
  LAC: 'LA Clippers',     LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies',
  MIA: 'Miami Heat',       MIL: 'Milwaukee Bucks',  MIN: 'Minnesota Timberwolves',
  NOP: 'New Orleans Pelicans', NYK: 'New York Knicks', OKC: 'Oklahoma City Thunder',
  ORL: 'Orlando Magic',    PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns',
  POR: 'Portland Trail Blazers', SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs',
  TOR: 'Toronto Raptors',  UTA: 'Utah Jazz',        WAS: 'Washington Wizards',
}

// GET /api/admin/draft/order?year=2026
// Returns the currently saved team_abbr and prospect pick per slot (nulls for unfilled).
export async function GET(req: Request) {
  const year = Number(new URL(req.url).searchParams.get('year'))
  if (!year) return NextResponse.json({ error: 'year is required' }, { status: 400 })

  const { data, error } = await sb
    .from('draft_results')
    .select('slot, team_abbr, prospect_id, prospect_name')
    .eq('year', year)
    .order('slot')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bySlot = new Map((data ?? []).map(r => [r.slot as number, r]))
  const maxSlot = Math.max(0, ...(data ?? []).map(r => r.slot as number))
  const teams = Array.from({ length: maxSlot }, (_, i) => bySlot.get(i + 1)?.team_abbr ?? null)
  const results = Array.from({ length: maxSlot }, (_, i) => {
    const row = bySlot.get(i + 1)
    return { prospectId: row?.prospect_id ?? null, prospectName: row?.prospect_name ?? null }
  })

  return NextResponse.json({ teams, results })
}

// POST /api/admin/draft/order
// Body: { year: number, teams: string[] }  — teams[0] = pick 1 team abbr, etc.
// Upserts team_abbr/team_name into draft_results for each slot. Only team columns
// are included in the payload, so any prospect pick already saved for a slot
// (via /api/admin/draft/results) is left untouched.
export async function POST(req: Request) {
  const { year, teams } = await req.json() as { year: number; teams: string[] }

  if (!year || !Array.isArray(teams) || teams.length === 0) {
    return NextResponse.json({ error: 'year and teams array required' }, { status: 400 })
  }

  const rows = teams
    .map(abbr => abbr.trim().toUpperCase())
    .filter(abbr => abbr.length > 0)
    .map((abbr, i) => ({
      year,
      slot: i + 1,
      team_abbr: abbr,
      team_name: TEAM_NAMES[abbr] ?? abbr,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid teams parsed' }, { status: 400 })
  }

  const { error } = await sb.from('draft_results').upsert(rows, { onConflict: 'year,slot' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ saved: rows.length })
}
