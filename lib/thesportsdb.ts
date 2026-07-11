const KEY = process.env.THESPORTSDB_KEY ?? '3'
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`

export interface TSDBEvent {
  idEvent: string
  strEvent: string
  strHomeTeam: string
  strAwayTeam: string
  intHomeScore: string | null
  intAwayScore: string | null
  strStatus: string | null
  dateEvent: string
  strTime: string | null
}

export interface TSDBPlayer {
  idPlayer: string
  strPlayer: string
  strTeam: string | null
  strThumb: string | null
  strCutout: string | null
  strRender: string | null
}

export interface TSDBTeam {
  idTeam: string
  strTeam: string
  strLeague: string | null
}

export interface TSDBRosterPlayer {
  idPlayer: string
  strPlayer: string
  strTeam: string | null
}

export async function fetchNBAEventsByDate(date: string): Promise<TSDBEvent[]> {
  try {
    const res = await fetch(`${BASE}/eventsday.php?d=${date}&l=NBA`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    return json.events ?? []
  } catch {
    return []
  }
}

export async function searchPlayer(name: string): Promise<TSDBPlayer[]> {
  try {
    const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(name)}`)
    if (!res.ok) return []
    const json = await res.json()
    return json.player ?? []
  } catch {
    return []
  }
}

export async function fetchNBATeams(): Promise<TSDBTeam[]> {
  try {
    const res = await fetch(`${BASE}/search_all_teams.php?l=NBA`)
    if (!res.ok) return []
    const json = await res.json()
    return json.teams ?? []
  } catch {
    return []
  }
}

export async function fetchTeamRoster(teamId: string): Promise<TSDBRosterPlayer[]> {
  try {
    const res = await fetch(`${BASE}/lookup_all_players.php?id=${teamId}`)
    if (!res.ok) return []
    const json = await res.json()
    return json.player ?? []
  } catch {
    return []
  }
}

// Returns lowercase player names for every player currently on an NBA roster.
// Falls back to an empty set (no whitelist filter) if the TheSportsDB key
// doesn't have roster access, so the caller can decide how to degrade.
export async function fetchCurrentNBAPlayerNames(): Promise<Set<string>> {
  const teams = await fetchNBATeams()
  if (!teams.length) return new Set()

  const names = new Set<string>()
  for (const team of teams) {
    const roster = await fetchTeamRoster(team.idTeam)
    for (const p of roster) {
      if (p.strPlayer) names.add(p.strPlayer.toLowerCase().trim())
    }
    // Stay within free-tier rate limits
    await new Promise(r => setTimeout(r, 200))
  }
  return names
}

export function eventStatus(event: TSDBEvent): 'final' | 'scheduled' | 'live' {
  const s = (event.strStatus ?? '').toLowerCase().trim()
  if (s === 'match finished' || s === 'ft' || s === 'aet') return 'final'
  if (s === 'ns' || s === 'not started' || s === '') return 'scheduled'
  return 'live'
}

export const TEAM_ABBR: Record<string, string> = {
  'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
  'Los Angeles Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
}

export function abbr(teamName: string): string {
  return TEAM_ABBR[teamName] ?? teamName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
}
