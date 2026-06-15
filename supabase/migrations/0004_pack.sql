-- Pick & Pack: scannable barcodes, labels (AWB), and audited pack sessions.

alter table products add column if not exists barcode text;
alter table orders   add column if not exists label_number text;
create index if not exists idx_orders_label on orders(label_number);

create table if not exists pack_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  label_number text,
  packer_id uuid references users(id),
  status text not null default 'in_progress', -- in_progress | completed
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_pack_sessions_order on pack_sessions(order_id);
create index if not exists idx_pack_sessions_packer on pack_sessions(packer_id, started_at desc);

-- Per-line required vs scanned progress for a session.
create table if not exists pack_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pack_sessions(id) on delete cascade,
  product_id uuid references products(id),
  sku text,
  barcode text,
  name text,
  required int not null default 0,
  scanned int not null default 0
);
create index if not exists idx_pack_items_session on pack_session_items(session_id);

-- Immutable audit log: every individual scan, timestamped + attributable.
create table if not exists pack_scans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pack_sessions(id) on delete cascade,
  product_id uuid references products(id),
  sku text,
  name text,
  scanned_by uuid references users(id),
  scanned_at timestamptz not null default now()
);
create index if not exists idx_pack_scans_session on pack_scans(session_id, scanned_at);

-- RLS: warehouse + admin write, all staff read.
alter table pack_sessions enable row level security;
alter table pack_session_items enable row level security;
alter table pack_scans enable row level security;

create policy pack_sessions_read on pack_sessions for select using (is_staff());
create policy pack_items_read on pack_session_items for select using (is_staff());
create policy pack_scans_read on pack_scans for select using (is_staff());

create policy pack_sessions_write on pack_sessions for all
  using (auth_role() in ('admin','warehouse')) with check (auth_role() in ('admin','warehouse'));
create policy pack_items_write on pack_session_items for all
  using (auth_role() in ('admin','warehouse')) with check (auth_role() in ('admin','warehouse'));
create policy pack_scans_write on pack_scans for all
  using (auth_role() in ('admin','warehouse')) with check (auth_role() in ('admin','warehouse'));
