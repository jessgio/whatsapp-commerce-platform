-- Merlot Commerce Platform — core schema
-- Postgres / Supabase. Run via `supabase db push` or the SQL editor.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------- Enums ----------
do $$ begin
  create type app_role as enum ('admin','sales','cs','warehouse');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consent_status as enum ('opted_in','pending','opted_out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_status as enum ('open','pending','resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('new','paid','allocated','packed','shipped','delivered','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid','pending','paid','expired','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_priority as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_status as enum ('new','in_progress','waiting','resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shipment_status as enum ('draft','requested','picked_up','in_transit','delivered','returned');
exception when duplicate_object then null; end $$;

-- ---------- Users (mirrors auth.users) ----------
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role app_role not null default 'sales',
  avatar_color text default '#6f2c3f',
  created_at timestamptz not null default now()
);

-- ---------- Customers (keyed off WhatsApp wa_id) ----------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  name text not null,
  phone text,
  email text,
  city text,
  consent_status consent_status not null default 'pending',
  consent_channel text,
  segments text[] default '{}',
  tags text[] default '{}',
  lifetime_value bigint default 0,
  order_count int default 0,
  first_seen_at timestamptz default now(),
  last_order_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_created on customers(created_at desc);
create index if not exists idx_customers_name_trgm on customers using gin (name gin_trgm_ops);

-- consent ledger (immutable audit of opt-in/out incl. PII storage consent)
create table if not exists customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  status consent_status not null,
  channel text,
  scope text not null default 'messaging', -- messaging | address_pii
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Addresses (captured once, reused on every order) ----------
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text default 'Rumah',
  recipient_name text,
  recipient_phone text,
  line1 text,
  district text,
  city text,
  province text,
  postal_code text,
  lat double precision,
  lng double precision,
  is_default boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_addresses_customer on addresses(customer_id);

-- ---------- Conversations & messages ----------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade unique,
  assignee_id uuid references users(id),
  status conversation_status not null default 'open',
  unread int default 0,
  last_message_preview text,
  last_message_at timestamptz default now(),
  last_inbound_at timestamptz,
  first_response_seconds int,
  topic text,
  created_at timestamptz not null default now()
);
create index if not exists idx_conv_last_msg on conversations(last_message_at desc);
create index if not exists idx_conv_assignee on conversations(assignee_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  kind text not null default 'text',
  body text,
  author_name text,
  status text,
  wa_message_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on messages(conversation_id, created_at);

-- ---------- Cases ----------
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references customers(id) on delete set null,
  subject text not null,
  priority case_priority not null default 'medium',
  status case_status not null default 'new',
  owner_id uuid references users(id),
  order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Catalog ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text,
  image_color text default '#6f2c3f',
  retail_price bigint not null default 0,
  discount_percent int not null default 0,
  stock int not null default 0,
  reserved int not null default 0,
  reorder_point int not null default 40,
  active boolean not null default true,
  catalog_sync text not null default 'pending',
  units_30d int default 0,
  units_prev_30d int default 0,
  created_at timestamptz not null default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  delta int not null,
  reason text not null,
  order_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- Orders ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  status order_status not null default 'new',
  payment_status payment_status not null default 'unpaid',
  payment_provider text,
  payment_link text,
  channel text not null default 'whatsapp_cart',
  subtotal bigint not null default 0,
  shipping_cost bigint not null default 0,
  total bigint not null default 0,
  shipping_address_id uuid references addresses(id),
  shipping_address_snapshot jsonb, -- snapshot at purchase time
  courier text,
  tracking_number text,
  flagged_issue text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_customer on orders(customer_id, status);
create index if not exists idx_orders_created on orders(created_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  sku text,
  name text,
  qty int not null,
  unit_price bigint not null
);
create index if not exists idx_order_items_order on order_items(order_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  reference text,
  amount bigint not null,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------- Shipments ----------
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  biteship_order_id text,
  courier text,
  service text,
  tracking_number text,
  status shipment_status not null default 'draft',
  cost bigint default 0,
  destination_city text,
  created_at timestamptz not null default now()
);

create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  status text,
  note text,
  at timestamptz not null default now()
);

-- ---------- Warehouse notices ----------
create table if not exists warehouse_notices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  raised_by uuid references users(id),
  type text not null default 'other',
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------- Infra ----------
create table if not exists webhook_events (
  id text primary key,
  source text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists catalog_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued',
  pushed int default 0,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  entity text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
