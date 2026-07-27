-- Form templates: QR lead form builder + thank-you landing blocks.

alter table customers
  add column if not exists form_answers jsonb not null default '{}'::jsonb;

create table if not exists form_templates (
  id text primary key,
  name text not null,
  kind text not null default 'library'
    check (kind in ('system', 'library')),
  is_published boolean not null default true,
  form_page jsonb not null default '{}'::jsonb,
  fields jsonb not null default '[]'::jsonb,
  thank_you jsonb not null default '{}'::jsonb,
  discount_code text not null default 'AERIS15',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_templates_name_len check (char_length(trim(name)) between 1 and 120)
);

create index if not exists form_templates_updated_idx on form_templates (updated_at desc);

alter table form_templates enable row level security;

drop policy if exists form_templates_staff_read on form_templates;
create policy form_templates_staff_read
  on form_templates for select using (is_staff());

drop policy if exists form_templates_staff_write on form_templates;
create policy form_templates_staff_write
  on form_templates for all
  using (auth_role() in ('admin', 'sales'))
  with check (auth_role() in ('admin', 'sales'));
