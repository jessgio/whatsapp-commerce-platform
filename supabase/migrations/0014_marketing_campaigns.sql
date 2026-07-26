-- Marketing designs (WhatsApp) + campaigns.

create table if not exists wa_template_designs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  meta_template_name text not null,
  language_code text not null default 'id',
  category text not null default 'MARKETING'
    check (category in ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  header jsonb not null default '{"type":"none"}'::jsonb,
  body text not null,
  footer text not null default '',
  buttons jsonb not null default '[]'::jsonb,
  variable_defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wa_template_designs_name_len check (char_length(trim(name)) between 1 and 80)
);

create table if not exists wa_interactive_designs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('text', 'image', 'reply_buttons', 'list')),
  body text not null,
  header_text text not null default '',
  footer_text text not null default '',
  image_url text not null default '',
  buttons jsonb not null default '[]'::jsonb,
  list_button_label text not null default 'Options',
  list_sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wa_interactive_designs_name_len check (char_length(trim(name)) between 1 and 80)
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('whatsapp', 'email')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  segment_id uuid references customer_segment_definitions(id) on delete set null,
  scheduled_at timestamptz,
  wa_mode text check (wa_mode is null or wa_mode in ('template', 'interactive')),
  wa_design_id text,
  email_subject text,
  email_accent_color text,
  email_blocks jsonb,
  sent_at timestamptz,
  send_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_name_len check (char_length(trim(name)) between 1 and 80)
);

create index if not exists wa_template_designs_updated_idx
  on wa_template_designs (updated_at desc);
create index if not exists wa_interactive_designs_updated_idx
  on wa_interactive_designs (updated_at desc);
create index if not exists campaigns_updated_idx
  on campaigns (updated_at desc);
create index if not exists campaigns_status_idx
  on campaigns (status);

alter table wa_template_designs enable row level security;
alter table wa_interactive_designs enable row level security;
alter table campaigns enable row level security;

create policy wa_template_designs_staff_read
  on wa_template_designs for select using (is_staff());
create policy wa_template_designs_write
  on wa_template_designs for all
  using (auth_role() in ('admin', 'sales'))
  with check (auth_role() in ('admin', 'sales'));

create policy wa_interactive_designs_staff_read
  on wa_interactive_designs for select using (is_staff());
create policy wa_interactive_designs_write
  on wa_interactive_designs for all
  using (auth_role() in ('admin', 'sales'))
  with check (auth_role() in ('admin', 'sales'));

create policy campaigns_staff_read
  on campaigns for select using (is_staff());
create policy campaigns_write
  on campaigns for all
  using (auth_role() in ('admin', 'sales'))
  with check (auth_role() in ('admin', 'sales'));
