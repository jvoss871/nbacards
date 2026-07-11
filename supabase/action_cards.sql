-- Action Cards System
-- Run after schema.sql

-- Define each action card type
create table if not exists action_card_types (
  id text primary key,
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('common', 'rare', 'elite')),
  icon text not null,
  context text not null check (context in ('trivia', 'picks', 'packs'))
);

insert into action_card_types (id, name, description, rarity, icon, context) values
  ('skip',        'Skip',        'Skip a trivia question without penalty',                              'common', '⏭',  'trivia'),
  ('safety_net',  'Safety Net',  'Lock your current step as the guaranteed payout floor',               'rare',   '🪢',   'trivia'),
  ('insurance',   'Insurance',   'If your pick loses, your wagered card is returned to you',            'rare',   '🛡',  'picks'),
  ('double_down', 'Double Down', 'Double the credit reward on your next winning wager',                 'elite',  '⚡',   'picks'),
  ('reroll',      'Reroll',      'Dismiss one card from a pack and draw a replacement',                 'common', '🎲',  'packs'),
  ('repack',      'Repack',      'Scrap your entire pack result and draw a completely new set',         'elite',  '🔄',  'packs')
on conflict (id) do nothing;

-- User inventory of action cards
create table if not exists user_action_cards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  action_card_type_id text not null references action_card_types(id),
  used boolean not null default false,
  acquired_at timestamptz default now()
);

-- Add bonus slot columns to pack_types
alter table pack_types
  add column if not exists action_bonus_chance float not null default 0,
  add column if not exists action_card_pool jsonb not null default '{}';

-- Starter: 8% — Common only (Skip 60, Reroll 40)
update pack_types
set
  action_bonus_chance = 0.08,
  action_card_pool    = '{"skip": 60, "reroll": 40}'
where name = 'Starter';

-- Hardwood: 18% — Common 50%, Rare 50%
update pack_types
set
  action_bonus_chance = 0.18,
  action_card_pool    = '{"skip": 30, "reroll": 20, "safety_net": 30, "insurance": 20}'
where name = 'Hardwood';

-- Elite: 35% — Common 15%, Rare 50%, Elite 35%
update pack_types
set
  action_bonus_chance = 0.35,
  action_card_pool    = '{"skip": 5, "reroll": 10, "safety_net": 25, "insurance": 25, "double_down": 20, "repack": 15}'
where name = 'Elite';
