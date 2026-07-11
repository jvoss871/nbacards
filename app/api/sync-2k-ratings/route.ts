import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Tier } from '@/lib/types'

// Manual tier overrides — edit this list to control player tiers.
// Keys are normalized names (lowercase, no accents, no punctuation).
const TIER_OVERRIDES: Record<string, Tier> = {
  'victor wembanyama': 'platinum',
  'anthony edwards':   'platinum',
  'jalen brunson':     'platinum',
  'cade cunningham':   'platinum',
  'devin booker':      'gold',
  'anthony davis':     'gold',
  'ja morant':         'silver',
}

const MULTIPLIERS: Record<Tier, number> = {
  platinum: 2.0, gold: 1.5, silver: 1.25, bronze: 1.1,
}

// Max players per tier eligible for pack draws / prestige.
// Within each tier, players are sorted alphabetically and the first N are in_pool.
const POOL_CAPS: Record<Tier, number> = {
  platinum: 15,
  gold:     35,
  silver:   65,
  bronze:   90,
}

function normalizeName(name: string): string {
  return name
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['''.]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/sync-2k-ratings
// Applies TIER_OVERRIDES to specific players and enforces POOL_CAPS.
// Non-overridden players keep their existing DB tier.
// tier_locked players are never touched.
export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const sb = serviceClient()
  const { data: players, error } = await sb.from('players').select('id, name, tier, tier_locked')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve effective tier: tier_locked > TIER_OVERRIDES > existing DB tier > bronze
  type Resolved = { id: string; name: string; tier: Tier }
  const resolved: Resolved[] = []

  for (const player of players ?? []) {
    const key = normalizeName(player.name)
    let tier: Tier
    if (player.tier_locked) {
      tier = player.tier as Tier
    } else if (TIER_OVERRIDES[key] !== undefined) {
      tier = TIER_OVERRIDES[key]
    } else {
      tier = (player.tier as Tier) ?? 'bronze'
    }
    resolved.push({ id: player.id, name: player.name, tier })
  }

  // Apply pool caps — alphabetical sort within tier for determinism
  const inPool = new Set<string>()
  for (const tier of ['platinum', 'gold', 'silver', 'bronze'] as Tier[]) {
    resolved
      .filter(p => p.tier === tier)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, POOL_CAPS[tier])
      .forEach(p => inPool.add(p.id))
  }

  // Write updates
  const tierCounts: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 }
  const overrideApplied: string[] = []

  for (const p of resolved) {
    const in_pool = inPool.has(p.id)
    await sb
      .from('players')
      .update({ tier: p.tier, multiplier: MULTIPLIERS[p.tier], in_pool })
      .eq('id', p.id)
    if (in_pool) tierCounts[p.tier]++
    if (TIER_OVERRIDES[normalizeName(p.name)] !== undefined) overrideApplied.push(p.name)
  }

  return NextResponse.json({
    pool_total:      inPool.size,
    tiers:           tierCounts,
    overrides_applied: overrideApplied,
  })
}
