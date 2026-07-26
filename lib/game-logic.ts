import type { Tier, PackType, Player } from './types'

export const BASE_CREDITS_PER_WIN = 10

export const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string; glow: string }> = {
  bronze:   { bg: 'bg-amber-900/30',  text: 'text-amber-400',  border: 'border-amber-600',  glow: 'shadow-amber-600/40' },
  silver:   { bg: 'bg-slate-400/20',  text: 'text-slate-300',  border: 'border-slate-400',  glow: 'shadow-slate-400/40' },
  gold:     { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-400', glow: 'shadow-yellow-400/50' },
  platinum: { bg: 'bg-blue-400/20',   text: 'text-blue-200',   border: 'border-blue-300',   glow: 'shadow-blue-300/60' },
}

export const TIER_LABEL: Record<Tier, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
}

// Reroll draws are floored at the old card's tier, independent of whichever pack is being
// opened — a per-pack odds table would let a caller just submit whichever pack_id has the
// most favorable ratio for the tier they're rerolling.
export const REROLL_ODDS: Record<Tier, number> = { bronze: 0.55, silver: 0.30, gold: 0.13, platinum: 0.02 }

export function calcCreditsEarned(multiplier: number): number {
  return Math.round(BASE_CREDITS_PER_WIN * multiplier)
}

// guaranteedSlot=true: this card slot is guaranteed to be at least pack.guaranteed_tier.
// guaranteedSlot=false: raw odds apply — any tier (including bronze) can drop.
export function drawCard(pack: Pick<PackType, 'odds' | 'guaranteed_tier'>, players: Player[], guaranteedSlot = false): Player {
  const { odds, guaranteed_tier } = pack
  const tierOrder: Tier[] = ['bronze', 'silver', 'gold', 'platinum']
  const guaranteedIdx = tierOrder.indexOf(guaranteed_tier)

  let drawnTier: Tier

  if (guaranteedSlot) {
    const eligible = tierOrder.slice(guaranteedIdx)
    const total = eligible.reduce((sum, t) => sum + (odds[t] ?? 0), 0)
    let r = Math.random() * (total || 1)
    drawnTier = guaranteed_tier
    for (const tier of eligible) {
      r -= odds[tier] ?? 0
      if (r <= 0) { drawnTier = tier; break }
    }
  } else {
    const total = tierOrder.reduce((sum, t) => sum + (odds[t] ?? 0), 0)
    let r = Math.random() * (total || 1)
    drawnTier = tierOrder[0]
    for (const tier of tierOrder) {
      r -= odds[tier] ?? 0
      if (r <= 0) { drawnTier = tier; break }
    }
  }

  const pool = players.filter(p => p.tier === drawnTier)
  const source = pool.length > 0 ? pool : players
  if (source.length === 0) throw new Error('No players available to draw from')
  return source[Math.floor(Math.random() * source.length)]
}

// Draws a full pack's worth of cards: one guaranteed-tier-or-better slot, platinum capped
// at one per pack, reliability rolled per card. Used both when opening a pack and repacking.
export function drawPackCards(
  pack: PackType,
  players: Player[],
  rollReliability: (tier: Tier) => number,
): { player: Player; reliability: number }[] {
  const cards: { player: Player; reliability: number }[] = []
  let platinumDrawn = 0
  const guaranteedSlot = Math.floor(Math.random() * pack.card_count)
  for (let i = 0; i < pack.card_count; i++) {
    let card = drawCard(pack, players, i === guaranteedSlot)
    if (card.tier === 'platinum' && platinumDrawn >= 1) {
      card = drawCard({ ...pack, odds: { ...pack.odds, platinum: 0 } }, players, i === guaranteedSlot)
    }
    if (card.tier === 'platinum') platinumDrawn++
    cards.push({ player: card, reliability: rollReliability(card.tier) })
  }
  return cards
}

// Rolls for a bonus action card given a pack's pool weights. Returns action card id or null.
export function drawActionCard(
  bonusChance: number,
  pool: Record<string, number>,
): string | null {
  if (Math.random() > bonusChance) return null
  const entries = Object.entries(pool).filter(([, w]) => w > 0)
  if (entries.length === 0) return null
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [id, weight] of entries) {
    r -= weight
    if (r <= 0) return id
  }
  return entries[entries.length - 1][0]
}

// Returns all available cards for wagering on a team, sorted best-first.
// pendingWagerIds: player IDs already locked on unsettled predictions.
export function availableCardsForTeam(
  teamAbbr: string,
  ownedCards: { player: Player; quantity: number }[],
  pendingWagerIds: Set<string> = new Set(),
): Player[] {
  return ownedCards
    .filter(c =>
      c.player.team_abbr === teamAbbr &&
      c.quantity > 0 &&
      !pendingWagerIds.has(c.player.id)
    )
    .map(c => c.player)
    .sort((a, b) => b.multiplier - a.multiplier)
}
