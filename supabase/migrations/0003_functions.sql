-- Triggers & helper functions.

-- Auto-create a staff profile row when an auth user is created.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'sales')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep orders.updated_at fresh.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_orders_touch on orders;
create trigger trg_orders_touch before update on orders
  for each row execute function touch_updated_at();

-- Reserve stock when an order becomes paid; release on cancel.
create or replace function apply_stock_reservation() returns trigger
language plpgsql as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update products p set reserved = reserved + oi.qty
    from order_items oi where oi.order_id = new.id and oi.product_id = p.id;
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update products p set reserved = greatest(0, reserved - oi.qty)
    from order_items oi where oi.order_id = new.id and oi.product_id = p.id;
  elsif new.status = 'shipped' and old.status is distinct from 'shipped' then
    update products p set stock = greatest(0, stock - oi.qty),
                         reserved = greatest(0, reserved - oi.qty)
    from order_items oi where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_stock_reservation on orders;
create trigger trg_stock_reservation after update of status on orders
  for each row execute function apply_stock_reservation();

-- Lightweight analytics rollup (refresh via cron / pg_cron).
create materialized view if not exists daily_sales as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where payment_status = 'paid') as paid_orders,
  coalesce(sum(total) filter (where payment_status = 'paid'),0) as revenue
from orders
group by 1
order by 1;

create unique index if not exists idx_daily_sales_day on daily_sales(day);
