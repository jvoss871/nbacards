const BASE = 'https://api.balldontlie.io/v1'

export interface BDLTeam {
  id: number
  conference: string
  division: string
  city: string
  name: string
  full_name: string
  abbreviation: string
}

export interface BDLPlayer {
  id: number
  first_name: string
  last_name: string
  position: string
  height: string
  weight: string
  jersey_number: string
  college: string
  country: string
  draft_year: number | null
  draft_round: number | null
  draft_number: number | null
  team: BDLTeam
}

export interface BDLSeasonAverage {
  player_id: number
  season: number
  games_played: number
  min: string
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  fg_pct: number
  fg3_pct: number
  ft_pct: number
  turnover: number
}

// BallDontLie's team IDs for the 30 current NBA franchises. Low and stable —
// defunct historical franchises (Chicago Stags, etc.) all sit at id 37+.
export const BDL_ACTIVE_TEAM_IDS: Record<string, number> = {
  ATL: 1, BOS: 2, BKN: 3, CHA: 4, CHI: 5, CLE: 6, DAL: 7, DEN: 8, DET: 9, GSW: 10,
  HOU: 11, IND: 12, LAC: 13, LAL: 14, MEM: 15, MIA: 16, MIL: 17, MIN: 18, NOP: 19, NYK: 20,
  OKC: 21, ORL: 22, PHI: 23, PHX: 24, POR: 25, SAC: 26, SAS: 27, TOR: 28, UTA: 29, WAS: 30,
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function bdlFetch(url: string, apiKey: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: apiKey } })

  if (res.status === 429) {
    if (attempt >= 4) throw new Error(`BDL rate limit exceeded after ${attempt} retries`)
    // Respect Retry-After header, otherwise exponential backoff
    const retryAfter = res.headers.get('Retry-After')
    const waitMs = retryAfter ? Number(retryAfter) * 1000 : 2000 * Math.pow(2, attempt)
    await delay(waitMs)
    return bdlFetch(url, apiKey, attempt + 1)
  }

  return res
}

export async function fetchActivePlayers(apiKey: string, season?: number, teamIds?: number[]): Promise<BDLPlayer[]> {
  const all: BDLPlayer[] = []
  let cursor: number | undefined

  while (true) {
    const url = new URL(`${BASE}/players`)
    url.searchParams.set('per_page', '100')
    if (season !== undefined) url.searchParams.set('season', String(season))
    if (cursor) url.searchParams.set('cursor', String(cursor))
    // Filtering server-side by team keeps this to current rosters (~500 players)
    // instead of paginating BDL's entire all-time player history (thousands of
    // retired players) just to throw most of it away client-side afterward.
    teamIds?.forEach(id => url.searchParams.append('team_ids[]', String(id)))

    const res = await bdlFetch(url.toString(), apiKey)
    if (!res.ok) throw new Error(`BDL /players failed: ${res.status}`)

    const json = await res.json()
    const page: BDLPlayer[] = json.data ?? []

    // Only include players currently on a team (active roster)
    all.push(...page.filter(p => p.team?.id && p.team.abbreviation))

    cursor = json.meta?.next_cursor ?? undefined
    if (!cursor) break

    await delay(300)
  }

  return all
}

export async function fetchSeasonAverages(
  apiKey: string,
  playerIds: number[],
  season: number,
): Promise<BDLSeasonAverage[]> {
  const all: BDLSeasonAverage[] = []
  const BATCH = 25

  for (let i = 0; i < playerIds.length; i += BATCH) {
    const batch = playerIds.slice(i, i + BATCH)
    const url = new URL(`${BASE}/season_averages`)
    url.searchParams.set('season', String(season))
    batch.forEach(id => url.searchParams.append('player_ids[]', String(id)))

    const res = await bdlFetch(url.toString(), apiKey)
    if (res.ok) {
      const json = await res.json()
      all.push(...(json.data ?? []))
    }

    if (i + BATCH < playerIds.length) await delay(1000)
  }

  return all
}
