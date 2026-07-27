-- Multi-template email library + custom brand fonts for the designer.

alter table email_templates
  add column if not exists name text;

alter table email_templates
  add column if not exists description text;

alter table email_templates
  add column if not exists kind text not null default 'campaign'
    check (kind in ('system', 'campaign'));

update email_templates
set
  name = coalesce(nullif(trim(name), ''), 'Lead welcome'),
  kind = 'system',
  description = coalesce(
    description,
    'Sent automatically to new joiners from the QR lead form.'
  )
where id = 'lead_welcome';

update email_templates
set name = coalesce(nullif(trim(name), ''), id)
where name is null or trim(name) = '';

alter table email_templates
  alter column name set not null;

-- Allow marketing editors (sales) to manage templates, not only admin.
drop policy if exists email_templates_admin_write on email_templates;
create policy email_templates_staff_write
  on email_templates for all
  using (auth_role() in ('admin', 'sales'))
  with check (auth_role() in ('admin', 'sales'));

create table if not exists email_fonts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  css_family text not null,
  fallback text not null default 'sans'
    check (fallback in ('sans', 'serif', 'mono', 'display')),
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_fonts_name_len check (char_length(trim(name)) between 1 and 80),
  constraint email_fonts_css_family_len check (char_length(trim(css_family)) between 1 and 80)
);

create index if not exists email_fonts_updated_idx on email_fonts (updated_at desc);

alter table email_fonts enable row level security;

create policy email_fonts_staff_read
  on email_fonts for select using (is_staff());

create policy email_fonts_staff_write
  on email_fonts for all
  using (auth_role() in ('admin', 'sales'))
  with check (auth_role() in ('admin', 'sales'));

-- Font files live beside email images (public URLs for email clients).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'email-fonts',
  'email-fonts',
  true,
  5242880,
  array[
    'font/woff',
    'font/woff2',
    'font/ttf',
    'font/otf',
    'application/font-woff',
    'application/font-woff2',
    'application/x-font-ttf',
    'application/x-font-opentype',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy email_fonts_public_read
  on storage.objects for select
  using (bucket_id = 'email-fonts');

create policy email_fonts_staff_insert
  on storage.objects for insert
  with check (bucket_id = 'email-fonts' and auth_role() in ('admin', 'sales'));

create policy email_fonts_staff_update
  on storage.objects for update
  using (bucket_id = 'email-fonts' and auth_role() in ('admin', 'sales'))
  with check (bucket_id = 'email-fonts' and auth_role() in ('admin', 'sales'));

create policy email_fonts_staff_delete
  on storage.objects for delete
  using (bucket_id = 'email-fonts' and auth_role() in ('admin', 'sales'));

-- Optional link from campaigns back to a library template (content still snapshotted).
alter table campaigns
  add column if not exists email_template_id text references email_templates(id) on delete set null;
