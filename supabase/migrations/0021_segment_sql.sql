-- Evaluate saved segment rules in SQL instead of shipping every customer row to
-- Node and filtering there. The JS engine in src/lib/segments.ts stays for the
-- interactive builder preview; these functions are the authoritative path for
-- member counts, member lists, and campaign audiences, none of which can be
-- correct while the reader is capped at 500 rows.
--
-- The compiler builds a WHERE fragment and EXECUTEs it, so the planner can use
-- indexes. Every value from the rules JSON reaches the statement through
-- format(%L); field and operator names only ever select a fixed string from a
-- whitelist, so a crafted rules payload cannot inject SQL. All three functions
-- are SECURITY INVOKER, so RLS on `customers` still applies to the caller.

-- Mirrors customerAgeYears(): null for a missing birth date, and null rather
-- than a value outside 0..120, which the app treats as unusable data.
create or replace function customer_age_years(p_birth date, p_at timestamptz)
returns int
language sql
stable
as $$
  select case
    when p_birth is null then null
    when yrs < 0 or yrs > 120 then null
    else yrs
  end
  from (
    select extract(year from age((p_at at time zone 'utc')::date, p_birth))::int as yrs
  ) s;
$$;

create or replace function segment_condition_sql(p_cond jsonb, p_now timestamptz)
returns text
language plpgsql
stable
as $$
declare
  v_field text := p_cond->>'field';
  v_op    text := p_cond->>'op';
  v_val   jsonb := p_cond->'value';
  v_kind  text := jsonb_typeof(p_cond->'value');
  v_raw   text := '';
  v_txt   text := '';
  v_num   numeric;
  v_lo    numeric;
  v_hi    numeric;
  v_col   text;
  v_age   text := format('customer_age_years(c.birth_date, %L::timestamptz)', p_now);
  v_days  text := format(
    'floor(extract(epoch from (%L::timestamptz - c.last_order_at)) / 86400)',
    p_now
  );
  v_cmp   text;
begin
  -- asString(): numbers stringify, anything else is the empty string.
  if v_kind in ('string', 'number') then
    v_raw := v_val #>> '{}';
  end if;
  v_txt := lower(btrim(v_raw));

  -- asNumber(): a number, or a string that parses cleanly. Anything else is
  -- null, and a condition with an unusable value matches nobody.
  if v_kind = 'number' then
    v_num := (v_val #>> '{}')::numeric;
  elsif v_kind = 'string' and btrim(v_raw) ~ '^-?\d+(\.\d+)?$' then
    v_num := btrim(v_raw)::numeric;
  end if;

  -- asRange(): a two-element array, normalised low-to-high.
  if v_kind = 'array' and jsonb_array_length(v_val) = 2
     and (v_val->>0) ~ '^-?\d+(\.\d+)?$' and (v_val->>1) ~ '^-?\d+(\.\d+)?$' then
    v_lo := least((v_val->>0)::numeric, (v_val->>1)::numeric);
    v_hi := greatest((v_val->>0)::numeric, (v_val->>1)::numeric);
  end if;

  v_cmp := case v_op
    when 'eq' then '=' when 'gt' then '>' when 'gte' then '>='
    when 'lt' then '<' when 'lte' then '<=' else null
  end;

  if v_field in ('lifetime_value', 'order_count') then
    v_col := case v_field
      when 'lifetime_value' then 'coalesce(c.lifetime_value, 0)'
      else 'coalesce(c.order_count, 0)'
    end;
    if v_op = 'between' then
      if v_lo is null then return 'false'; end if;
      return format('%s between %L and %L', v_col, v_lo, v_hi);
    end if;
    if v_cmp is null or v_num is null then return 'false'; end if;
    return format('%s %s %L', v_col, v_cmp, v_num);

  elsif v_field = 'last_order_at' then
    if v_op in ('never', 'is_empty') then return 'c.last_order_at is null'; end if;
    if v_op = 'is_not_empty' then return 'c.last_order_at is not null'; end if;
    if v_num is null then return 'false'; end if;
    if v_op = 'within_days' then
      return format('(c.last_order_at is not null and %s <= %L)', v_days, v_num);
    end if;
    if v_op = 'before_days' then
      return format('(c.last_order_at is not null and %s > %L)', v_days, v_num);
    end if;
    return 'false';

  elsif v_field = 'city' then
    if v_op = 'is_empty' then return format('btrim(coalesce(c.city, %L)) = %L', '', ''); end if;
    if v_op = 'is_not_empty' then return format('btrim(coalesce(c.city, %L)) <> %L', '', ''); end if;
    if v_txt = '' then return 'false'; end if;
    -- strpos rather than LIKE so % and _ in the needle stay literal.
    if v_op = 'eq' then
      return format('lower(btrim(coalesce(c.city, %L))) = %L', '', v_txt);
    end if;
    if v_op = 'contains' then
      return format('strpos(lower(btrim(coalesce(c.city, %L))), %L) > 0', '', v_txt);
    end if;
    if v_op = 'not_contains' then
      return format('strpos(lower(btrim(coalesce(c.city, %L))), %L) = 0', '', v_txt);
    end if;
    return 'false';

  elsif v_field = 'age' then
    if v_op = 'is_empty' then return format('%s is null', v_age); end if;
    if v_op = 'between' then
      if v_lo is null then return 'false'; end if;
      return format('(%s is not null and %s between %L and %L)', v_age, v_age, v_lo, v_hi);
    end if;
    if v_cmp is null or v_num is null then return 'false'; end if;
    return format('(%s is not null and %s %s %L)', v_age, v_age, v_cmp, v_num);

  elsif v_field = 'consent_status' then
    -- Cast to text: an arbitrary value must not raise an invalid-enum error.
    -- Matches the JS, which compares the raw value without normalising it.
    if v_op = 'eq' then return format('c.consent_status::text = %L', v_raw); end if;
    if v_op = 'neq' then return format('c.consent_status::text <> %L', v_raw); end if;
    return 'false';

  elsif v_field in ('tag', 'legacy_segment') then
    v_col := case v_field when 'tag' then 'c.tags' else 'c.segments' end;
    if v_txt = '' then return 'false'; end if;
    if v_op = 'eq' then
      return format(
        'exists (select 1 from unnest(coalesce(%s, %L::text[])) t where lower(t) = %L)',
        v_col, '{}', v_txt
      );
    end if;
    if v_op = 'contains' then
      return format(
        'exists (select 1 from unnest(coalesce(%s, %L::text[])) t where strpos(lower(t), %L) > 0)',
        v_col, '{}', v_txt
      );
    end if;
    return 'false';
  end if;

  return 'false';
end;
$$;

create or replace function segment_rules_sql(p_rules jsonb, p_now timestamptz)
returns text
language plpgsql
stable
as $$
declare
  v_conds jsonb := p_rules->'conditions';
  v_parts text[] := '{}';
  v_cond  jsonb;
begin
  -- An empty rule set matches nobody, same as customerMatchesRules().
  if v_conds is null or jsonb_typeof(v_conds) <> 'array'
     or jsonb_array_length(v_conds) = 0 then
    return 'false';
  end if;

  for v_cond in select value from jsonb_array_elements(v_conds) loop
    v_parts := v_parts || segment_condition_sql(v_cond, p_now);
  end loop;

  if coalesce(p_rules->>'match', 'all') = 'any' then
    return '(' || array_to_string(v_parts, ' or ') || ')';
  end if;
  return '(' || array_to_string(v_parts, ' and ') || ')';
end;
$$;

create or replace function count_segment_members(p_rules jsonb, p_consent text default null)
returns bigint
language plpgsql
stable
as $$
declare
  v_count bigint;
begin
  execute format(
    'select count(*) from customers c where %s%s',
    segment_rules_sql(p_rules, now()),
    case when p_consent is null then ''
         else format(' and c.consent_status::text = %L', p_consent) end
  ) into v_count;
  return v_count;
end;
$$;

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
    'select c.* from customers c where %s%s order by c.created_at desc limit %s offset %s',
    segment_rules_sql(p_rules, now()),
    case when p_consent is null then ''
         else format(' and c.consent_status::text = %L', p_consent) end,
    greatest(coalesce(p_limit, 100), 0),
    greatest(coalesce(p_offset, 0), 0)
  );
end;
$$;

revoke all on function count_segment_members(jsonb, text) from public, anon;
revoke all on function list_segment_members(jsonb, int, int, text) from public, anon;
grant execute on function count_segment_members(jsonb, text) to authenticated, service_role;
grant execute on function list_segment_members(jsonb, int, int, text) to authenticated, service_role;
