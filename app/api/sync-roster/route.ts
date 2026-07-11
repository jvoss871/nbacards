import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchActivePlayers } from '@/lib/balldontlie'
import { fetchActiveNBAPlayerNames, nbaCdnHeadshotUrl } from '@/lib/nba-stats'
import type { Tier } from '@/lib/types'

// Active NBA franchise abbreviations
const ACTIVE_NBA_TEAMS = new Set([
  'ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET',
  'GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN',
  'NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS',
  'TOR','UTA','WAS',
])

// Only include players from the modern era (eliminates retired historical players)
// LeBron (2003) is the oldest realistic active player
const MIN_DRAFT_YEAR = 2003

const MULTIPLIERS: Record<Tier, number> = {
  platinum: 2.0, gold: 1.5, silver: 1.25, bronze: 1.1,
}

// Draft-position fallback — only used for players not yet rated by sync-2k-ratings.
// Tiers are authoritative once sync-2k-ratings has run.
function assignTier(draftRound: number | null, draftNumber: number | null, draftYear: number | null): Tier {
  const isLottery     = draftRound === 1 && draftNumber !== null && draftNumber <= 14
  const isEstablished = draftRound === 1 && draftYear !== null && draftYear <= 2022
  if (isLottery || isEstablished) return 'silver'
  return 'bronze'
}

function normalizePosition(pos: string): string {
  if (!pos) return 'F'
  return pos.split('-')[0] ?? 'F'
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/sync-roster
export async function POST() {
  if (!process.env.BALLDONTLIE_API_KEY) {
    return NextResponse.json({ error: 'BALLDONTLIE_API_KEY not set' }, { status: 500 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const apiKey = process.env.BALLDONTLIE_API_KEY
  const sb = serviceClient()

  // ── 1. Build an active-player whitelist ──────────────────────
  // Primary: NBA.com stats API. Fallback: ESPN public team rosters.
  // If both fail, we skip the whitelist and rely on draft-year alone.
  const { names: currentNBANames, nameToNbaId, source: whitelistSource } = await fetchActiveNBAPlayerNames()
  const useRosterWhitelist = currentNBANames.size > 200

  // ── 2. Fetch all players from BallDontLie ─────────────────────
  let allPlayers
  try {
    allPlayers = await fetchActivePlayers(apiKey)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }

  // ── 3. Filter to truly active NBA players ─────────────────────
  const activePlayers = allPlayers.filter(p => {
    if (!p.team?.abbreviation || !ACTIVE_NBA_TEAMS.has(p.team.abbreviation)) return false
    if (p.draft_year !== null && p.draft_year < MIN_DRAFT_YEAR) return false

    // Cross-reference against TheSportsDB current rosters when available.
    // This is the key filter that eliminates retired players whose last
    // known team in BDL is still an active NBA franchise.
    if (useRosterWhitelist) {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase().trim()
      // Also check ASCII-normalized version to handle diacritical mismatches
      // between BDL and NBA.com (e.g. "Jokic" vs "Jokic" with combining char)
      const fullNameAscii = fullName.normalize('NFD').replace(/[̀-ͯ]/g, '')
      if (!currentNBANames.has(fullName) && !currentNBANames.has(fullNameAscii)) return false
    }

    return true
  })

  // ── 4. Load existing players ──────────────────────────────────
  const { data: existing } = await sb
    .from('players')
    .select('id, name, bdl_id, rating_2k, tier, image_url')

  const byBdlId  = new Map((existing ?? []).filter(p => p.bdl_id).map(p => [p.bdl_id as number, p]))
  const byName   = new Map((existing ?? []).map(p => [p.name.toLowerCase(), p]))
  // Players with a 2K rating keep their tier — don't let draft-based logic overwrite it
  const has2kRating = new Set((existing ?? []).filter(p => p.rating_2k).map(p => p.id as string))

  // ── 5. Upsert ─────────────────────────────────────────────────
  let inserted = 0, updated = 0

  for (const player of activePlayers) {
    const fullName = `${player.first_name} ${player.last_name}`
    const lower    = fullName.toLowerCase()
    const ascii    = lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const existingRow = byBdlId.get(player.id) ?? byName.get(lower)

    // Only assign tier from draft-position logic for players without a 2K rating.
    // Players already rated by sync-2k-ratings keep their tier.
    const use2kTier = existingRow && has2kRating.has(existingRow.id as string)
    const tier = use2kTier
      ? (existingRow!.tier as Tier ?? 'bronze')
      : assignTier(player.draft_round, player.draft_number, player.draft_year)

    const nbaId   = nameToNbaId.get(lower) ?? nameToNbaId.get(ascii)
    const imageUrl = nbaId ? nbaCdnHeadshotUrl(nbaId) : null

    const record = {
      name:       fullName,
      team:       player.team.full_name,
      team_abbr:  player.team.abbreviation,
      position:   normalizePosition(player.position),
      bdl_id:     player.id,
      tier,
      multiplier: MULTIPLIERS[tier],
    }

    if (existingRow) {
      const updates: typeof record & { image_url?: string } = { ...record }
      // Backfill image_url only if the row currently has none
      if (!existingRow.image_url && imageUrl) updates.image_url = imageUrl
      await sb.from('players').update(updates).eq('id', existingRow.id)
      updated++
    } else {
      await sb.from('players').insert({ ...record, image_url: imageUrl, tier_locked: false })
      inserted++
    }
  }

  // ── 6. Remove players no longer on active rosters ─────────────
  const activeBdlIds = new Set(activePlayers.map(p => p.id))
  const activeNames  = new Set(activePlayers.map(p => `${p.first_name} ${p.last_name}`.toLowerCase()))
  const stale = (existing ?? []).filter(p => {
    if (p.bdl_id) return !activeBdlIds.has(p.bdl_id as number)
    // No bdl_id: check by name so pre-bdl_id rows are also cleaned up
    return !activeNames.has((p.name as string).toLowerCase())
  })
  if (stale.length > 0) {
    await sb.from('players').delete().in('id', stale.map(p => p.id))
  }

  // Build tier counts — query each tier separately to avoid the 1000-row default limit
  const tierCounts: Record<string, number> = {}
  for (const tier of ['platinum', 'gold', 'silver', 'bronze']) {
    const { count } = await sb.from('players').select('*', { count: 'exact', head: true }).eq('tier', tier)
    if (count !== null) tierCounts[tier] = count
  }

  return NextResponse.json({
    total_fetched: allPlayers.length,
    whitelist_source: useRosterWhitelist ? whitelistSource : 'none',
    whitelist_size: currentNBANames.size,
    active_filtered: activePlayers.length,
    inserted,
    updated,
    removed: stale.length,
    tiers: tierCounts,
  })
}
