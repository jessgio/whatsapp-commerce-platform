-- Shared fixed-window rate limiting for the public (unauthenticated) endpoints.
-- Serverless instances do not share memory, so the counter has to live here.

create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);

-- Only the service role touches this table; the RPC below is security definer.
alter table rate_limits enable row level security;

-- Counts one hit against `p_key` and reports whether it is still under the
-- limit. The insert-or-update runs as a single statement so concurrent requests
-- cannot both read the same count and each believe they are under the cap.
create or replace function consume_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
) returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window interval := make_interval(secs => p_window_seconds);
  v_hits int;
  v_start timestamptz;
begin
  insert into rate_limits as rl (key, window_start, hits)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set hits = case when rl.window_start + v_window <= v_now then 1 else rl.hits + 1 end,
        window_start = case when rl.window_start + v_window <= v_now then v_now else rl.window_start end
  returning rl.hits, rl.window_start into v_hits, v_start;

  -- Keys are per-IP, so without this the table grows forever. Sampling keeps the
  -- sweep off the hot path for all but a small fraction of requests.
  if random() < 0.01 then
    delete from rate_limits where window_start < v_now - interval '1 day';
  end if;

  return query select v_hits <= p_limit, greatest(p_limit - v_hits, 0), v_start + v_window;
end;
$$;

revoke all on function consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function consume_rate_limit(text, int, int) to service_role;
