-- Dynamic CRM segment definitions (rules evaluated at query time).
create table if not exists customer_segment_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  rules jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_segment_definitions_name_len check (char_length(trim(name)) between 1 and 80)
);

create index if not exists customer_segment_definitions_updated_idx
  on customer_segment_definitions (updated_at desc);

alter table customer_segment_definitions enable row level security;

create policy customer_segment_definitions_staff_read
  on customer_segment_definitions for select
  using (is_staff());

create policy customer_segment_definitions_write
  on customer_segment_definitions for all
  using (auth_role() in ('admin', 'sales'))
  with check (auth_role() in ('admin', 'sales'));
