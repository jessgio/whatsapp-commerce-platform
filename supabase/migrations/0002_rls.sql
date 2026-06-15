-- Row Level Security. Internal staff app: every authenticated user has a row in
-- `users` with a role. Reads are broadly allowed to authenticated staff; writes
-- are constrained by role. PII (full addresses) is additionally gated in the app
-- layer (customers.pii permission) and can be tightened here per deployment.

-- Helper: current user's role.
create or replace function auth_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where id = auth.uid());
$$;

-- Enable RLS on all domain tables.
do $$
declare t text;
begin
  foreach t in array array[
    'users','customers','customer_consents','addresses','conversations','messages',
    'cases','products','inventory_movements','orders','order_items','payments',
    'shipments','shipment_events','warehouse_notices','catalog_sync_jobs','audit_log'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- Users: can read all staff, can read/update self.
create policy users_read on users for select using (is_staff());
create policy users_self_update on users for update using (id = auth.uid());

-- Generic staff-read on operational tables.
do $$
declare t text;
begin
  foreach t in array array[
    'customers','customer_consents','addresses','conversations','messages',
    'cases','products','inventory_movements','orders','order_items','payments',
    'shipments','shipment_events','warehouse_notices','catalog_sync_jobs','audit_log'
  ] loop
    execute format('create policy %I_staff_read on %I for select using (is_staff());', t, t);
  end loop;
end $$;

-- Writes by role.
create policy customers_write on customers for all
  using (auth_role() in ('admin','sales','cs')) with check (auth_role() in ('admin','sales','cs'));

create policy addresses_write on addresses for all
  using (auth_role() in ('admin','sales','cs')) with check (auth_role() in ('admin','sales','cs'));

create policy messages_write on messages for insert
  with check (auth_role() in ('admin','sales','cs'));

create policy conversations_write on conversations for all
  using (auth_role() in ('admin','sales','cs')) with check (auth_role() in ('admin','sales','cs'));

create policy cases_write on cases for all
  using (auth_role() in ('admin','sales','cs')) with check (auth_role() in ('admin','sales','cs'));

create policy products_write on products for all
  using (auth_role() in ('admin','sales','warehouse')) with check (auth_role() in ('admin','sales','warehouse'));

create policy orders_write on orders for all
  using (auth_role() in ('admin','sales','warehouse')) with check (auth_role() in ('admin','sales','warehouse'));

create policy order_items_write on order_items for all
  using (auth_role() in ('admin','sales','warehouse')) with check (auth_role() in ('admin','sales','warehouse'));

create policy shipments_write on shipments for all
  using (auth_role() in ('admin','warehouse')) with check (auth_role() in ('admin','warehouse'));

create policy notices_write on warehouse_notices for all
  using (is_staff()) with check (is_staff());

create policy inventory_write on inventory_movements for all
  using (auth_role() in ('admin','warehouse')) with check (auth_role() in ('admin','warehouse'));
