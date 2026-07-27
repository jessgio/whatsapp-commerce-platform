-- Make segment member paging deterministic.
--
-- 0021 ordered by created_at alone. That is not a total order: customers
-- imported in the same batch share a timestamp, and Postgres is free to return
-- tied rows in a different order per query. listAllSegmentMembers() pages
-- through this function, so a tie straddling a page boundary could send one
-- recipient a campaign twice and skip another entirely. The id tiebreaker
-- makes the order stable across pages.

create or replace function list_segment_members(
  p_rules jsonb,
  p_limit int default 100,
  p_offset int default 0,
  p_consent text default null
)
returns setof customers
language plpgsql
stable
as $$
begin
  return query execute format(
    'select c.* from customers c where %s%s order by c.created_at desc, c.id limit %s offset %s',
    segment_rules_sql(p_rules, now()),
    case when p_consent is null then ''
         else format(' and c.consent_status::text = %L', p_consent) end,
    greatest(coalesce(p_limit, 100), 0),
    greatest(coalesce(p_offset, 0), 0)
  );
end;
$$;

create index if not exists customers_created_at_id_idx
  on public.customers (created_at desc, id);
