-- Pack report headline figures.
--
-- The page read the 200 most recent sessions (each with its scans) and reduced
-- them in JS, so "Pack sessions", "Units scanned" and the average pack time all
-- described a rolling window of 200 rather than the whole history. Scans in
-- particular are the largest child table in the warehouse, and loading them all
-- just to take a length was the most expensive read on the page.

create or replace function public.pack_report_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'sessions', (select count(*) from pack_sessions),
    'completed', (
      select count(*) from pack_sessions where status = 'completed'
    ),
    'avgPackSeconds', (
      select coalesce(
        round(avg(extract(epoch from (completed_at - started_at)))),
        0
      )
      from pack_sessions
      where status = 'completed' and completed_at is not null
    ),
    'unitsScanned', (select count(*) from pack_scans)
  );
$$;

comment on function public.pack_report_summary() is
  'Headline totals for the warehouse pack report. RLS applies (security invoker).';

create index if not exists pack_sessions_status_idx
  on public.pack_sessions (status);
