-- Fixes a real UX problem: /open?packId=X triggers the actual purchase (charge + card draw)
-- from a useEffect on page load, so any browser refresh of that URL re-fires the same POST
-- and buys another pack — an easy, entirely accidental way to get double-charged.
--
-- The Buy button now generates a one-time id and carries it in the URL as `openId`. The
-- open route uses it as an idempotency key: the first request for a given id does the real
-- purchase and stores the result here; any later request with the same id (i.e. a refresh
-- of the same /open?...&openId=... URL) just replays the stored result instead of buying
-- again.
create table if not exists pack_open_results (
  id         text primary key,
  user_id    text not null,
  result     jsonb not null,
  created_at timestamptz default now()
);
