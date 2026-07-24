-- Tracks which one-time onboarding callouts (app/api/onboarding) a user has already dismissed.
create table if not exists user_onboarding_seen (
  user_id text not null,
  key     text not null,
  seen_at timestamptz default now(),
  primary key (user_id, key)
);

alter table user_onboarding_seen enable row level security;
drop policy if exists "read own" on user_onboarding_seen;
create policy "read own" on user_onboarding_seen for select using (auth.uid()::text = user_id);
