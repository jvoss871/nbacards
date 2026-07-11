import type { Tier } from './types'

// Cumulative credits earned at each question step (index = step number)
export const PAYOUTS = [0, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

// Steps that establish a new credit floor (can't go below these if you lose)
export const SAFETY_NET_STEPS = new Set([5, 10])

// Questions per difficulty tier (5 easy, 5 medium, 5 hard)
export const QUESTIONS_PER_TIER = 5

// Per-tier reliability ranges rolled at pack-open time (integer percentages)
export const RELIABILITY_RANGE: Record<Tier, [number, number]> = {
  platinum: [88, 95],
  gold:     [68, 80],
  silver:   [55, 68],
  bronze:   [42, 56],
}

// Fallback reliability (midpoint of range) for cards pulled before this feature shipped
export const PHONE_RELIABILITY_DEFAULT: Record<Tier, number> = {
  platinum: 90,
  gold:     75,
  silver:   65,
  bronze:   50,
}

export function rollReliability(tier: Tier): number {
  const [min, max] = RELIABILITY_RANGE[tier]
  return Math.round(min + Math.random() * (max - min))
}

export function floorForStep(step: number): number {
  if (step >= 10) return PAYOUTS[10]  // 500
  if (step >= 5)  return PAYOUTS[5]   // 100
  return 0
}

// reliability: integer percentage (e.g. 88), or null to use tier default
export function phoneHint(
  correctAnswer: string,
  tier: Tier,
  options: string[],
  reliability?: number | null,
): string {
  const pct = reliability ?? PHONE_RELIABILITY_DEFAULT[tier]
  if (Math.random() * 100 < pct) return correctAnswer
  const wrong = options.filter(o => o !== correctAnswer)
  return wrong[Math.floor(Math.random() * wrong.length)]
}
