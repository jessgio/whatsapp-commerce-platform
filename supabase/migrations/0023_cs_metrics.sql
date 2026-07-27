-- CS dashboard aggregates in Postgres.
--
-- computeCsMetrics() reduced the 200 most recent conversations and the 200 most
-- recent cases, so every counter on the page was really "…among the newest 200",
-- and an older open case simply stopped being counted.
--
-- One behaviour change: "Resolved today" previously counted every resolved case
-- in that window regardless of date. It now counts cases resolved today (UTC),
-- approximated by updated_at because `cases` has no resolved_at column and no
-- write path in the app yet.

create or replace function public.cs_metrics()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with conv as (
    select
      count(*) filter (where status <> 'resolved') as active_chats,
      count(*) filter (where status <> 'resolved' and assignee_id is null)
        as unassigned_chats,
      coalesce(avg(first_response_seconds)
        filter (where first_response_seconds is not null), 0) as avg_first_response_sec,
      count(*) filter (where first_response_seconds > 600) as sla_breaches
    from conversations
  ),
  case_totals as (
    select
      count(*) filter (where status <> 'resolved') as active_cases,
      count(*) filter (
        where status = 'resolved'
          and (updated_at at time zone 'utc')::date = (now() at time zone 'utc')::date
      ) as resolved_today
    from cases
  ),
  by_owner as (
    select coalesce(u.name, 'Unassigned') as name, count(*) as open
    from cases c
    left join users u on u.id = c.owner_id
    where c.status <> 'resolved'
    group by 1
  ),
  by_priority as (
    select p.priority, p.ord, count(c.id) as count
    from unnest(array['urgent', 'high', 'medium', 'low']) with ordinality
      as p(priority, ord)
    left join cases c
      on c.priority::text = p.priority
     and c.status <> 'resolved'
    group by p.priority, p.ord
  )
  select jsonb_build_object(
    'activeCases', ct.active_cases,
    'activeChats', cv.active_chats,
    'unassignedChats', cv.unassigned_chats,
    'avgFirstResponseMin', round((cv.avg_first_response_sec / 60)::numeric, 1),
    'resolvedToday', ct.resolved_today,
    'slaBreaches', cv.sla_breaches,
    'byOwner', (
      select coalesce(
        jsonb_agg(jsonb_build_object('name', name, 'open', open) order by open desc, name),
        '[]'::jsonb
      )
      from by_owner
    ),
    'byPriority', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('priority', priority, 'count', count) order by ord
        ),
        '[]'::jsonb
      )
      from by_priority
    )
  )
  from conv cv, case_totals ct;
$$;

comment on function public.cs_metrics() is
  'CS dashboard aggregates over the full conversations/cases tables. RLS applies (security invoker).';

-- Open-case lookups by owner and priority, and the resolved-today count.
create index if not exists cases_status_updated_at_idx
  on public.cases (status, updated_at desc);

create index if not exists conversations_status_idx
  on public.conversations (status);
