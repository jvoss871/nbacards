-- Sums completed purchase amounts in the database instead of pulling every
-- row into the app just to add them up in JS. `since` is optional — omit for
-- an all-time total, pass a timestamp for a rolling window (e.g. last 30 days).
create or replace function sum_completed_purchases(since timestamptz default null)
returns bigint
language sql
stable
as $$
  select coalesce(sum(amount_cents), 0)::bigint
  from purchases
  where status = 'completed'
    and (since is null or created_at >= since)
$$;
