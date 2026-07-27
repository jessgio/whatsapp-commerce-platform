-- Indexes for queries the app actually runs. Each one below is backed by a
-- specific call site; speculative indexes are omitted because they cost write
-- throughput on the webhook paths for nothing.

-- listShipments embeds shipment_events, which PostgREST resolves by filtering
-- children on shipment_id. Without this it is a sequential scan per shipment.
-- The shipping webhook also dedupes on (shipment_id, status, at).
create index if not exists idx_shipment_events_shipment
  on shipment_events (shipment_id, at desc);

-- Every courier status update looks a shipment up by this column.
create index if not exists idx_shipments_biteship
  on shipments (biteship_order_id)
  where biteship_order_id is not null;

-- Ordering columns for the list readers in repo.ts.
create index if not exists idx_shipments_created
  on shipments (created_at desc);
create index if not exists idx_cases_created
  on cases (created_at desc);
create index if not exists idx_warehouse_notices_created
  on warehouse_notices (created_at desc);
create index if not exists idx_email_templates_updated
  on email_templates (updated_at desc);

-- listDueCampaigns filters status then ranges on scheduled_at; the existing
-- campaigns_status_idx cannot serve the range half.
create index if not exists idx_campaigns_due
  on campaigns (status, scheduled_at);

-- The payment webhook updates by (order_id, status).
create index if not exists idx_payments_order_status
  on payments (order_id, status);

-- listOrdersForCustomer orders by created_at; idx_orders_customer is
-- (customer_id, status) and cannot supply the sort.
create index if not exists idx_orders_customer_created
  on orders (customer_id, created_at desc);
