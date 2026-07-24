-- Row Level Security — closes the gap where the anon key (embedded in client JS) had
-- unrestricted read/write access to every table, since no table in this project had RLS
-- enabled at all.
--
-- Run this after confirming Phase 1 (real per-user auth.uid() identity everywhere) is live —
-- these policies are worthless against the old shared 'default' user_id.
--
-- Two treatments used below:
--   A) Fully locked (RLS enabled, zero policies) — for tables nothing in client code ever
--      queries directly (only server routes via the service-role key, which bypasses RLS).
--      This is the strictest option and is used wherever it doesn't break anything.
--   B) Owner-scoped read-only (auth.uid()::text = user_id) — for tables the client legitimately
--      reads directly with the anon key; every write to these goes through a service-role
--      server route instead, so no write policy exists for any of them.
--   C) Public read-only — for shared reference data the client reads directly but never
--      writes (writes are admin/service-role only).

-- ── A) Fully locked — admin/service-role access only ──
alter table trivia_questions enable row level security;
alter table trivia_pending_questions enable row level security;
alter table trivia_sessions enable row level security;
alter table user_legends enable row level security;
alter table purchases enable row level security;
alter table question_flags enable row level security;
alter table user_events enable row level security;
alter table hall_of_fame enable row level security;
alter table legends enable row level security;
alter table draft_prospects enable row level security;
alter table draft_results enable row level security;
alter table draft_picks enable row level security;
alter table app_settings enable row level security;
alter table action_card_types enable row level security;
-- (no policies created for any of the above — every access goes through a server route
--  using the service-role key, which bypasses RLS by design)

-- ── C) Public read-only reference data ──
alter table players enable row level security;
drop policy if exists "public read" on players;
create policy "public read" on players for select using (true);

alter table games enable row level security;
drop policy if exists "public read" on games;
create policy "public read" on games for select using (true);

alter table pack_types enable row level security;
drop policy if exists "public read" on pack_types;
create policy "public read" on pack_types for select using (true);

-- ── B) Owner-scoped ──
alter table draft_boards enable row level security;
drop policy if exists "read own" on draft_boards;
create policy "read own" on draft_boards for select using (auth.uid()::text = user_id);
-- writes happen via app/api/draft/board and /lock (service role) — no write policy needed

-- user_cards, user_state, user_action_cards, and predictions: packs (app/api/packs/open,
-- /reroll, /repack) and picks/predictions (app/api/picks/lock, /unlock, lib/settle-predictions)
-- both now write these exclusively through service-role server routes, which bypass RLS —
-- so the client only ever needs read access to its own rows. No write policy at all.
--
-- "default user" was a leftover policy from before real auth existed — grants unconditional
-- access (no auth.uid() check at all) to any row where user_id = 'default'. Since Postgres
-- OR's together multiple permissive policies, this alone defeats "read own" below for the
-- shared 'default' account unless explicitly dropped. Not in any tracked .sql file (same
-- dashboard-only-object situation as question_flags elsewhere in this project). user_action_cards
-- also had two more stray policies: "public insert" (with_check: true — anyone could insert
-- any row) and "public read" (qual: true — anyone could read every row).
alter table user_cards enable row level security;
drop policy if exists "default user" on user_cards;
drop policy if exists "own rows" on user_cards;
drop policy if exists "read own" on user_cards;
create policy "read own" on user_cards for select using (auth.uid()::text = user_id);

alter table user_state enable row level security;
drop policy if exists "default user" on user_state;
drop policy if exists "own rows" on user_state;
drop policy if exists "read own" on user_state;
create policy "read own" on user_state for select using (auth.uid()::text = user_id);

alter table user_action_cards enable row level security;
drop policy if exists "default user" on user_action_cards;
drop policy if exists "public insert" on user_action_cards;
drop policy if exists "public read" on user_action_cards;
drop policy if exists "own rows" on user_action_cards;
drop policy if exists "read own" on user_action_cards;
create policy "read own" on user_action_cards for select using (auth.uid()::text = user_id);

alter table predictions enable row level security;
drop policy if exists "default user" on predictions;
drop policy if exists "own rows" on predictions;
drop policy if exists "read own" on predictions;
create policy "read own" on predictions for select using (auth.uid()::text = user_id);
