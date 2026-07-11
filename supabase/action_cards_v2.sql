-- Action Cards v2 — run after action_cards.sql

-- Track which action cards are committed to picks
alter table predictions
  add column if not exists insurance_card_id uuid,
  add column if not exists double_down_card_id uuid;

-- Allow client to mark action cards as used
create policy "public update" on user_action_cards
  for update using (true) with check (true);
