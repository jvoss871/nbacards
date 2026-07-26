-- Atomic credit adjustment, replacing the "read balance, check it, write new balance" pattern
-- used in app/api/packs/open, app/api/trivia/answer, and app/api/trivia/walkaway. That pattern
-- is a classic TOCTOU race: two concurrent requests can both read the same starting balance
-- and both write based on it, so a script firing simultaneous requests could open unlimited
-- packs (or double-claim a trivia payout) while only ever being charged/credited once.
--
-- A single UPDATE ... WHERE ... RETURNING is safe under concurrency because Postgres takes a
-- row lock for the update; a second concurrent call waits for the first to commit, then
-- evaluates its own WHERE clause against the ALREADY-UPDATED row.
--
-- p_delta negative = spend (fails, returning null, if it would go negative — insufficient funds).
-- p_delta positive = award (always succeeds; the >= 0 guard is a no-op in this direction).
create or replace function adjust_credits(p_user_id text, p_delta int)
returns int language plpgsql as $$
declare
  new_balance int;
begin
  update user_state
  set credits = credits + p_delta
  where user_id = p_user_id and credits + p_delta >= 0
  returning credits into new_balance;
  return new_balance; -- null means: row not found, or insufficient credits for a spend
end;
$$;
