-- Sports Card Prediction Game Schema
-- Run this in your Supabase SQL editor, then run seed.sql

create table if not exists user_state (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique default 'default',
  credits integer not null default 150,
  updated_at timestamptz default now()
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  home_team_abbr text not null,
  away_team_abbr text not null,
  game_date date not null,
  game_time text,
  status text not null default 'scheduled', -- scheduled | final
  home_score integer,
  away_score integer,
  winner text, -- 'home' | 'away' | null
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team text not null,
  team_abbr text not null,
  position text not null,
  tier text not null, -- bronze | silver | gold | platinum
  multiplier numeric not null,
  created_at timestamptz default now()
);

create table if not exists pack_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  card_count integer not null,
  credit_cost integer not null,
  guaranteed_tier text not null,
  odds jsonb not null
);

create table if not exists user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  player_id uuid references players(id),
  quantity integer not null default 1,
  reliability integer,
  acquired_at timestamptz default now()
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  game_id uuid references games(id),
  predicted_winner text not null, -- 'home' | 'away'
  predicted_team text not null,
  multiplier_applied numeric not null default 1.0,
  card_used_id uuid references players(id),
  status text not null default 'pending', -- pending | correct | incorrect
  credits_earned integer,
  created_at timestamptz default now()
);
