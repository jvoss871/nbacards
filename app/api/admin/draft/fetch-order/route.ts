import { NextResponse } from 'next/server'

// GET /api/admin/draft/fetch-order?year=2026
// Fetches draft pick order from NBA stats API and returns team abbreviations in slot order.
export async function GET(req: Request) {
  const year = Number(new URL(req.url).searchParams.get('year') ?? 2026)
  // NBA.com's drafthistory endpoint keys Season to the plain draft year (e.g. "2025"),
  // not the "YYYY-YY" season-span format other stats endpoints use.
  const season = String(year)

  const url = `https://stats.nba.com/stats/drafthistory?LeagueID=00&Season=${season}&RoundNum=1&RoundPick=&TopX=&College=&Config=CUS&Connection=&Draft=&Overall=`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.nba.com/',
        'Origin': 'https://www.nba.com',
        'Accept': 'application/json, text/plain, */*',
        'x-nba-stats-origin': 'stats',
        'x-nba-stats-token': 'true',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to reach NBA API' }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: `NBA API returned ${res.status}` }, { status: 502 })
  }

  const json = await res.json()
  const resultSet = json?.resultSets?.[0]
  if (!resultSet) {
    return NextResponse.json({ error: 'Unexpected NBA API response shape' }, { status: 502 })
  }

  const headers: string[] = resultSet.headers
  const rows: unknown[][] = resultSet.rowSet

  const overallIdx = headers.indexOf('OVERALL_PICK')
  const teamIdx    = headers.indexOf('TEAM_ABBREVIATION')

  if (overallIdx === -1 || teamIdx === -1) {
    return NextResponse.json({ error: 'Could not find expected columns in response' }, { status: 502 })
  }

  // Sort by OVERALL_PICK ascending, extract team abbr
  const sorted = [...rows].sort((a, b) => Number(a[overallIdx]) - Number(b[overallIdx]))
  const teams = sorted.map(row => String(row[teamIdx]))

  return NextResponse.json({ teams, season })
}
