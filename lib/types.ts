export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type ActionCardRarity = 'common' | 'rare' | 'elite'
export type ActionCardContext = 'trivia' | 'picks' | 'packs'

export interface ActionCardType {
  id: string
  name: string
  description: string
  rarity: ActionCardRarity
  icon: string
  context: ActionCardContext
}

export interface UserActionCard {
  id: string
  user_id: string
  action_card_type_id: string
  used: boolean
  acquired_at: string
}

export interface Game {
  id: string
  home_team: string
  away_team: string
  home_team_abbr: string
  away_team_abbr: string
  game_date: string
  game_time: string | null
  status: string
  home_score: number | null
  away_score: number | null
  winner: string | null
}

export interface Player {
  id: string
  name: string
  team: string
  team_abbr: string
  position: string
  tier: Tier
  multiplier: number
  image_url?: string | null
  bdl_id?: number | null
  rating_2k?: number | null
  tier_locked?: boolean
}

export interface PackType {
  id: string
  name: string
  description: string
  card_count: number
  credit_cost: number
  guaranteed_tier: Tier
  odds: Record<string, number>
  action_bonus_chance?: number
  action_card_pool?: Record<string, number>
}

export interface UserCard {
  id: string
  user_id: string
  player_id: string
  quantity: number
  reliability: number[] | null
  acquired_at: string
}

export interface Prediction {
  id: string
  user_id: string
  game_id: string
  predicted_winner: string
  predicted_team: string
  multiplier_applied: number
  card_used_id: string | null
  insurance_card_id: string | null
  double_down_card_id: string | null
  status: string
  credits_earned: number | null
  created_at: string
}

export interface UserState {
  id?: string
  user_id: string
  credits: number
  updated_at?: string
}

// Supabase Database type — matches supabase-js v2 expected shape
export type Database = {
  public: {
    Tables: {
      user_state: {
        Row: UserState
        Insert: Omit<UserState, 'id' | 'updated_at'>
        Update: Partial<Omit<UserState, 'id'>>
      }
      games: {
        Row: Game
        Insert: Omit<Game, 'id'>
        Update: Partial<Game>
      }
      players: {
        Row: Player
        Insert: Omit<Player, 'id'>
        Update: Partial<Player>
      }
      pack_types: {
        Row: PackType
        Insert: Omit<PackType, 'id'>
        Update: Partial<PackType>
      }
      user_cards: {
        Row: UserCard
        Insert: Omit<UserCard, 'id' | 'acquired_at'>
        Update: Partial<UserCard>
      }
      predictions: {
        Row: Prediction
        Insert: Omit<Prediction, 'id' | 'created_at'>
        Update: Partial<Prediction>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
