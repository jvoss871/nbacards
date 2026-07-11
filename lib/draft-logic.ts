export const DRAFT_YEAR = 2026
export const FIRST_ROUND_SLOTS = 30
export const CREDIT_MULTIPLIER = 100  // 1st correct = 100cr, 2nd = 200cr, 3rd = 300cr…

// Total = CREDIT_MULTIPLIER × n(n+1)/2
export function calcDraftCredits(correctPicks: number): number {
  return CREDIT_MULTIPLIER * correctPicks * (correctPicks + 1) / 2
}

export interface DraftProspect {
  id: string
  year: number
  name: string
  position: string | null
  school: string | null
  projected_min: number | null
  projected_max: number | null
}

export interface DraftBoard {
  id: string
  user_id: string
  year: number
  status: 'open' | 'locked' | 'scored'
  credits_earned: number | null
  correct_picks: number | null
  locked_at: string | null
  scored_at: string | null
  created_at: string
}

export interface DraftPick {
  id: string
  board_id: string
  slot: number
  prospect_id: string
}

export interface DraftResult {
  year: number
  slot: number
  prospect_id: string | null
  prospect_name: string | null
  team_abbr: string | null
  team_name: string | null
}

export interface DraftSettings {
  enabled: boolean
  opens_at: string | null
  year: number
  lock_time: string | null
}
