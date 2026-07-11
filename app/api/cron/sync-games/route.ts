import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { settlePredictions } from '@/lib/settle-predictions'

interface BDLGame {
  id: number
  date: string
  home_team: { abbreviation: string; full_name: string }
  visitor_team: { abbreviation: string; full_name: string }
  home_team_score: number
  visitor_team_score: number
  status: string
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function offsetDay(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

async function fetchGamesForDate(apiKey: string, date: string): Promise<BDLGame[]> {
  const res = await fetch(
    `https://api.balldontlie.io/v1/games?dates[]=${date}&per_page=100`,
    { headers: { Authorization: apiKey }, cache: 'no-store' },
  )
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

async function syncDate(
  sb: ReturnType<typeof serviceClient>,
  apiKey: string,
  date: string,
): Promise<{ added: number; updated: number; settled: number }> {
  const games = await fetchGamesForDate(apiKey, date)
  if (!games.length) return { added: 0, updated: 0, settled: 0 }

  const { data: existing } = await sb.from('games').select('*').eq('game_date', date)
  const dbMap = new Map(
    (existing ?? []).map(g => [`${g.home_team_abbr}:${g.away_team_abbr}`, g]),
  )

  let added = 0, updated = 0, settled = 0

  for (const g of games) {
    const key     = `${g.home_team.abbreviation}:${g.visitor_team.abbreviation}`
    const dbGame  = dbMap.get(key)
    const final   = g.status === 'Final'
    const homeScore = g.home_team_score ?? null
    const awayScore = g.visitor_team_score ?? null
    const winner: 'home' | 'away' | null =
      final && homeScore !== null && awayScore !== null
        ? homeScore >= awayScore ? 'home' : 'away'
        : null

    if (dbGame) {
      if (final && dbGame.status !== 'final') {
        await sb
          .from('games')
          .update({ status: 'final', home_score: homeScore, away_score: awayScore, winner })
          .eq('id', dbGame.id)
        if (winner) settled += await settlePredictions(sb, dbGame.id, winner)
        updated++
      }
    } else {
      await sb.from('games').insert({
        home_team:      g.home_team.full_name,
        away_team:      g.visitor_team.full_name,
        home_team_abbr: g.home_team.abbreviation,
        away_team_abbr: g.visitor_team.abbreviation,
        game_date:      date,
        game_time:      null,
        status:         final ? 'final' : 'scheduled',
        home_score:     final ? homeScore : null,
        away_score:     final ? awayScore : null,
        winner,
      })
      added++
    }
  }

  return { added, updated, settled }
}

// POST /api/cron/sync-games
// Called by Vercel cron daily, or manually from admin.
// Body (optional): { dates: string[] }  — defaults to yesterday/today/tomorrow.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }
  const apiKey = process.env.BALLDONTLIE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'BALLDONTLIE_API_KEY not set' }, { status: 500 })
  }

  // Allow caller to pass explicit dates; otherwise default to yesterday/today/tomorrow
  let dates: string[]
  try {
    const body = await req.json().catch(() => ({}))
    dates = Array.isArray(body.dates) && body.dates.length > 0
      ? body.dates
      : (() => {
          const today = new Date()
          return [offsetDay(today, -1), today, offsetDay(today, 1)].map(dateStr)
        })()
  } catch {
    const today = new Date()
    dates = [offsetDay(today, -1), today, offsetDay(today, 1)].map(dateStr)
  }

  const sb = serviceClient()
  const totals = { added: 0, updated: 0, settled: 0, dates: dates.length }

  for (const date of dates) {
    const result = await syncDate(sb, apiKey, date)
    totals.added   += result.added
    totals.updated += result.updated
    totals.settled += result.settled
  }

  return NextResponse.json(totals)
}
