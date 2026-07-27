-- Warehouse live-mode gaps: RLS write access the portal actually needs, plus
-- indexes for the queries that replaced in-memory scans.

-- `shipment_events` had a staff read policy but no write policy, so affixing a
-- label from the portal could book the courier order and then fail to record
-- the tracking event.
create policy shipment_events_write on shipment_events for all
  using (auth_role() in ('admin','warehouse'))
  with check (auth_role() in ('admin','warehouse'));

-- `webhook_events` was never added to the RLS enable list in 0002, leaving raw
-- payment and WhatsApp payloads (customer PII) readable with the anon key.
-- Only the service role writes this table, so no policy is required.
alter table webhook_events enable row level security;

-- findOrderByLabel matches the scanned AWB case-insensitively via ILIKE, which
-- the plain btree indexes on these columns cannot serve. pg_trgm (enabled in
-- 0001) can, so the lookup stops scanning the whole orders table.
create index if not exists idx_orders_label_trgm
  on orders using gin (label_number gin_trgm_ops);
create index if not exists idx_orders_code_trgm
  on orders using gin (code gin_trgm_ops);

-- listPackableOrders filters on status with a label affixed.
create index if not exists idx_orders_packable on orders (status, created_at desc)
  where label_number is not null;

-- listPackSessions and the pack report order by start time.
create index if not exists idx_pack_sessions_started on pack_sessions (started_at desc);
