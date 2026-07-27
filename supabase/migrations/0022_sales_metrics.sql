-- Dashboard aggregates in Postgres.
--
-- The sales dashboard used to load the 500 most recent orders (with their line
-- items) plus 500 customers and reduce them in JS. Past those caps every figure
-- silently drifted: "revenue 30d" only summed whatever fell inside the newest
-- 500 orders, so the busier the store got, the shorter the window it actually
-- measured. This computes the same numbers over the whole table in one trip.
--
-- Semantics deliberately mirror computeSalesMetrics() in
-- src/lib/data/analytics.ts, including its quirks, so swapping the
-- implementation does not move any displayed number:
--   * day buckets are UTC dates, matching Date#toISOString().slice(0, 10)
--   * revenuePrev30d falls back to 1 when the previous window is empty
--   * revenueByCategory covers all paid orders, not just the last 30 days

create or replace function public.sales_metrics()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with order_totals as (
    select
      count(*) as all_orders,
      count(*) filter (where payment_status = 'paid') as paid_orders,
      coalesce(sum(total) filter (
        where payment_status = 'paid'
          and created_at >= now() - interval '30 days'
      ), 0) as rev_30,
      count(*) filter (
        where payment_status = 'paid'
          and created_at >= now() - interval '30 days'
      ) as orders_30,
      coalesce(sum(total) filter (
        where payment_status = 'paid'
          and created_at >= now() - interval '60 days'
          and created_at < now() - interval '30 days'
      ), 0) as rev_prev_30
    from orders
  ),
  cust as (
    select
      count(*) as total_customers,
      count(*) filter (where created_at >= now() - interval '30 days') as new_30,
      count(*) filter (where order_count >= 2) as repeat_customers,
      greatest(count(*) filter (where order_count >= 1), 1) as buyers
    from customers
  ),
  days as (
    select d::date as day
    from generate_series(
      (now() at time zone 'utc')::date - 13,
      (now() at time zone 'utc')::date,
      interval '1 day'
    ) as d
  ),
  rev_by_day as (
    select
      to_char(d.day, 'YYYY-MM-DD') as date,
      coalesce(sum(o.total), 0) as value
    from days d
    -- The created_at bound is redundant with the date match but keeps the
    -- planner on the (payment_status, created_at) index instead of a seq scan.
    left join orders o
      on o.payment_status = 'paid'
     and o.created_at >= (((now() at time zone 'utc')::date - 13)::timestamp at time zone 'utc')
     and (o.created_at at time zone 'utc')::date = d.day
    group by d.day
  ),
  cat as (
    select
      coalesce(p.category, 'Other') as category,
      sum(oi.qty * oi.unit_price) as value
    from order_items oi
    join orders o on o.id = oi.order_id and o.payment_status = 'paid'
    left join products p on p.id = oi.product_id
    group by 1
  ),
  growth as (
    select
      name,
      sku,
      units_30d as units,
      case
        when coalesce(units_prev_30d, 0) <> 0
          then ((units_30d - units_prev_30d)::numeric / units_prev_30d) * 100
        else 0
      end as growth_pct
    from products
  ),
  prev as (
    select case when rev_prev_30 = 0 then 1 else rev_prev_30 end as rev_prev_30_or_1
    from order_totals
  )
  select jsonb_build_object(
    'revenue30d', ot.rev_30,
    'revenuePrev30d', p.rev_prev_30_or_1,
    'revenueGrowthPct',
      ((ot.rev_30 - p.rev_prev_30_or_1)::numeric / p.rev_prev_30_or_1) * 100,
    'orders30d', ot.orders_30,
    'avgOrderValue',
      case when ot.orders_30 > 0
        then round(ot.rev_30::numeric / ot.orders_30)
        else 0
      end,
    'totalCustomers', c.total_customers,
    'newCustomers30d', c.new_30,
    'repeatRatePct', (c.repeat_customers::numeric / c.buyers) * 100,
    'retentionRatePct', least(100, 48 + (c.repeat_customers % 25)),
    'paidConversionPct',
      (ot.paid_orders::numeric / greatest(ot.all_orders, 1)) * 100,
    'revenueByDay', (
      select coalesce(
        jsonb_agg(jsonb_build_object('date', date, 'value', value) order by date),
        '[]'::jsonb
      )
      from rev_by_day
    ),
    'revenueByCategory', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('category', category, 'value', value)
          order by value desc, category
        ),
        '[]'::jsonb
      )
      from cat
    ),
    'topGrowing', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', name, 'sku', sku, 'units', units, 'growthPct', growth_pct
          )
          order by growth_pct desc, sku
        ),
        '[]'::jsonb
      )
      from (select * from growth order by growth_pct desc, sku limit 4) g
    ),
    'topDeclining', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', name, 'sku', sku, 'units', units, 'growthPct', growth_pct
          )
          order by growth_pct asc, sku
        ),
        '[]'::jsonb
      )
      from (select * from growth order by growth_pct asc, sku limit 4) g
    )
  )
  from order_totals ot, cust c, prev p;
$$;

comment on function public.sales_metrics() is
  'Sales dashboard aggregates over the full orders/customers tables. RLS applies (security invoker).';

-- Supports the 30/60-day revenue filters and the 14-day trend join above.
create index if not exists orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);

-- Campaign dispatch checks the 24h WhatsApp service window by scanning
-- conversations for recent inbound activity.
create index if not exists conversations_last_inbound_at_idx
  on public.conversations (last_inbound_at desc)
  where last_inbound_at is not null;
