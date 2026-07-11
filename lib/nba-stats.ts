// Active NBA roster data — tried in order until one returns data.
// No API keys required for any source.

// ── 1. NBA.com stats API ─────────────────────────────────────────────────────
// Official source. Works in browsers; may be blocked by Cloudflare in server
// contexts. Requires specific headers to bypass bot detection.

const NBA_STATS_BASE = 'https://stats.nba.com/stats'

const NBA_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.nba.com/',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
  'Origin': 'https://www.nba.com',
}

function currentNBASeason(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month >= 10 ? year : year - 1
  return `${startYear}-${String(startYear + 1).slice(2)}`
}

interface NBADotComResult {
  names: Set<string>
  nameToNbaId: Map<string, number>
}

async function fetchFromNBADotCom(): Promise<NBADotComResult> {
  const empty = { names: new Set<string>(), nameToNbaId: new Map<string, number>() }
  const s = currentNBASeason()
  const url = `${NBA_STATS_BASE}/commonallplayers?LeagueID=00&Season=${encodeURIComponent(s)}&IsOnlyCurrentSeason=1`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { headers: NBA_HEADERS, cache: 'no-store', signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return empty
    const json = await res.json()
    const resultSet = json.resultSets?.[0]
    if (!resultSet) return empty

    const headers: string[] = resultSet.headers ?? []
    const nameIdx = headers.indexOf('DISPLAY_FIRST_LAST')
    const idIdx   = headers.indexOf('PERSON_ID')
    if (nameIdx === -1 || idIdx === -1) return empty

    const names: Set<string> = new Set()
    const nameToNbaId: Map<string, number> = new Map()
    for (const row of resultSet.rowSet ?? []) {
      const name = String(row[nameIdx] ?? '').trim()
      const id   = Number(row[idIdx])
      if (name && id) {
        const lower = name.toLowerCase()
        // Also store ASCII-normalized version to handle diacritical mismatches
        // (e.g. NBA.com returns "Nikola Jokić" but BDL has "Nikola Jokic")
        const ascii = lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
        names.add(lower)
        names.add(ascii)
        nameToNbaId.set(lower, id)
        nameToNbaId.set(ascii, id)
      }
    }
    return { names, nameToNbaId }
  } catch {
    return empty
  }
}

// ── 2. ESPN public API ────────────────────────────────────────────────────────
// No auth, no special headers needed. Returns current team rosters.
// Fetches all 30 teams then their rosters — ~31 HTTP calls total.

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

async function fetchFromESPN(): Promise<Set<string>> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const teamsRes = await fetch(`${ESPN_BASE}/teams?limit=50`, { cache: 'no-store', signal: controller.signal })
    clearTimeout(timeout)
    if (!teamsRes.ok) return new Set()
    const teamsJson = await teamsRes.json()
    const teams: { id: string }[] = teamsJson.sports?.[0]?.leagues?.[0]?.teams?.map(
      (t: { team: { id: string } }) => t.team,
    ) ?? []
    if (!teams.length) return new Set()

    // Fetch all 30 rosters in parallel (ESPN handles concurrent requests fine)
    const rosterResults = await Promise.allSettled(
      teams.map(async team => {
        const c = new AbortController()
        const t = setTimeout(() => c.abort(), 5000)
        try {
          const res = await fetch(`${ESPN_BASE}/teams/${team.id}/roster`, { cache: 'no-store', signal: c.signal })
          clearTimeout(t)
          if (!res.ok) return []
          const json = await res.json()
          const athletes: { displayName?: string; fullName?: string }[] =
            json.athletes?.flatMap((g: { items?: { displayName?: string; fullName?: string }[] }) => g.items ?? []) ?? []
          return athletes.map(a => (a.displayName ?? a.fullName ?? '').trim().toLowerCase()).filter(Boolean)
        } catch {
          clearTimeout(t)
          return []
        }
      })
    )

    const names = new Set<string>()
    for (const result of rosterResults) {
      if (result.status === 'fulfilled') {
        for (const name of result.value) names.add(name)
      }
    }
    return names
  } catch {
    return new Set()
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type WhitelistSource = 'nba.com' | 'espn' | 'none'

export interface ActiveRosterResult {
  names: Set<string>
  // Maps lowercase player name → NBA.com player ID (only populated when source === 'nba.com')
  nameToNbaId: Map<string, number>
  source: WhitelistSource
}

// Tries NBA.com first, falls back to ESPN. Returns the names Set and which
// source was used so callers can log it.
export async function fetchActiveNBAPlayerNames(): Promise<ActiveRosterResult> {
  const nbaDotCom = await fetchFromNBADotCom()
  if (nbaDotCom.names.size > 200) {
    return { names: nbaDotCom.names, nameToNbaId: nbaDotCom.nameToNbaId, source: 'nba.com' }
  }

  const espn = await fetchFromESPN()
  if (espn.size > 200) {
    return { names: espn, nameToNbaId: new Map(), source: 'espn' }
  }

  return { names: new Set(), nameToNbaId: new Map(), source: 'none' }
}

// NBA.com CDN headshot URL for a given player ID.
export function nbaCdnHeadshotUrl(nbaPlayerId: number): string {
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${nbaPlayerId}.png`
}
