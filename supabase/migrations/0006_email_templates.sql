-- Editable transactional email templates (admin UI)
create table if not exists email_templates (
  id text primary key,
  subject text not null,
  brand_name text not null default 'Aeris Beauté',
  accent_color text not null default '#6f2c3f',
  banner_url text,
  greeting_template text not null default 'Hello, {name}',
  intro_text text not null default '',
  body_text text not null default '',
  discount_label text not null default 'Kode diskon Anda',
  show_discount boolean not null default true,
  closing_text text not null default '',
  footer_text text not null default '© Aeris Beauté',
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;

create policy email_templates_staff_read on email_templates
  for select using (is_staff());

create policy email_templates_admin_write on email_templates
  for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

insert into email_templates (
  id, subject, brand_name, accent_color, banner_url,
  greeting_template, intro_text, body_text, discount_label,
  show_discount, closing_text, footer_text
) values (
  'lead_welcome',
  'Halo {name} — kode diskon Aeris Beauté',
  'Aeris Beauté',
  '#6f2c3f',
  null,
  'Hello, {name}',
  'Terima kasih sudah bergabung bersama Aeris Beauté. Kami senang menyambut Anda.',
  'Sebagai apresiasi, berikut kode diskon spesial untuk Anda:',
  'Kode diskon Anda',
  true,
  'Simpan email ini agar kode tetap mudah ditemukan. Sampai jumpa di pembelian berikutnya.',
  '© Aeris Beauté'
) on conflict (id) do nothing;
