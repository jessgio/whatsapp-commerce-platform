-- Replace the placeholder retention rate with a real one.
--
-- The dashboard shipped with `min(100, 48 + (repeat_customers % 25))`, a
-- mock-data leftover that produced a plausible-looking 48-72% unconnected to
-- retention. It now measures repeat purchasing: of the customers who bought in
-- the previous 30-day window, the share who bought again in the last 30 days.
-- Everything else in sales_metrics() is unchanged from 0022.

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
  window_buyers as (
    select
      customer_id,
      bool_or(created_at >= now() - interval '30 days') as bought_recently,
      bool_or(
        created_at >= now() - interval '60 days'
        and created_at < now() - interval '30 days'
      ) as bought_previously
    from orders
    where payment_status = 'paid'
      and customer_id is not null
      and created_at >= now() - interval '60 days'
    group by customer_id
  ),
  retention as (
    select
      count(*) filter (where bought_previously) as prior_buyers,
      count(*) filter (where bought_previously and bought_recently) as returned
    from window_buyers
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
    'retentionRatePct',
      case when r.prior_buyers > 0
        then (r.returned::numeric / r.prior_buyers) * 100
        else 0
      end,
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
  from order_totals ot, cust c, prev p, retention r;
$$;

-- Retention groups paid orders by customer inside a 60-day window.
create index if not exists orders_customer_id_created_at_paid_idx
  on public.orders (customer_id, created_at desc)
  where payment_status = 'paid';
