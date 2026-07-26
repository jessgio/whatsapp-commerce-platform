-- Lead / QR web form fields on customers
alter table customers add column if not exists birth_date date;
alter table customers add column if not exists terms_accepted_at timestamptz;
alter table customers add column if not exists terms_version text;

-- Lookup helpers for dedupe (update-on-match; not unique)
create index if not exists idx_customers_email_lower
  on customers (lower(email))
  where email is not null;

create index if not exists idx_customers_phone
  on customers (phone)
  where phone is not null;

create index if not exists idx_customers_wa_id
  on customers (wa_id);
