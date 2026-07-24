-- ── App Settings (feature flags) ─────────────────────────────────────────────
create table if not exists app_settings (
  key   text primary key,
  value jsonb not null
);

insert into app_settings (key, value) values
  ('draft_enabled',   'false'),
  ('draft_opens_at',  'null'),
  ('draft_year',      '2026'),
  ('draft_lock_time', 'null')   -- ISO timestamp; null = not locked globally
on conflict (key) do nothing;

-- ── Draft Prospects (player bank) ────────────────────────────────────────────
create table if not exists draft_prospects (
  id             uuid primary key default gen_random_uuid(),
  year           int  not null,
  name           text not null,
  position       text,           -- PG | SG | SF | PF | C
  school         text,
  projected_min  int,            -- projected range low  (e.g. 1)
  projected_max  int,            -- projected range high (e.g. 5)
  created_at     timestamptz default now()
);

-- ── Draft Boards (one per user per year) ─────────────────────────────────────
create table if not exists draft_boards (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  year           int  not null,
  status         text not null default 'open',  -- open | locked | scored
  credits_earned int,
  correct_picks  int,
  locked_at      timestamptz,
  scored_at      timestamptz,
  created_at     timestamptz default now(),
  unique(user_id, year)
);

-- ── Draft Picks (up to 30 per board) ─────────────────────────────────────────
create table if not exists draft_picks (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references draft_boards(id) on delete cascade,
  slot         int  not null check (slot between 1 and 30),
  prospect_id  uuid not null references draft_prospects(id),
  unique(board_id, slot),
  unique(board_id, prospect_id)
);

-- ── Draft Results (filled in after the actual draft) ─────────────────────────
-- prospect_id = null if the player wasn't in our prospect pool
create table if not exists draft_results (
  id             uuid primary key default gen_random_uuid(),
  year           int  not null,
  slot           int  not null check (slot between 1 and 30),
  prospect_id    uuid references draft_prospects(id),
  prospect_name  text,            -- fallback display name
  unique(year, slot)
);

-- ── Sample prospects — replace with real 2027 class when known ───────────────
-- insert into draft_prospects (year, name, position, school, projected_min, projected_max) values
--   (2027, 'Prospect Name', 'PG', 'Duke', 1, 5),
--   ...
-- ;
