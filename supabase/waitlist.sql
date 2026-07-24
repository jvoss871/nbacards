create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  wants_beta boolean not null default false,
  created_at timestamptz default now()
);

alter table waitlist_signups enable row level security;

-- Public can submit the form, but the list itself is never readable via the
-- anon key — no select policy at all means only the service role can read it.
create policy "public can join waitlist" on waitlist_signups
  for insert
  with check (true);
