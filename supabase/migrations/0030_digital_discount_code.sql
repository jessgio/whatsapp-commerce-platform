-- Per-platform sticky vouchers: fisik (/daftar) vs digital (/f/[slug]).
-- Same phone may hold one code from each. Re-submit on a platform keeps
-- the first code issued there (so rotating the fisik card code is safe).

alter table customers
  add column if not exists digital_discount_code text;

comment on column customers.lead_discount_code is
  'First fisik (system /daftar) voucher for this phone; never overwritten.';

comment on column customers.digital_discount_code is
  'First Form Digital voucher for this phone; never overwritten.';

-- Codes issued only via Form Digital used to live in lead_discount_code.
update customers
set
  digital_discount_code = lead_discount_code,
  lead_discount_code = null
where digital_discount_code is null
  and lead_discount_code is not null
  and 'form_digital' = any (tags)
  and not ('qr_lead' = any (tags));
