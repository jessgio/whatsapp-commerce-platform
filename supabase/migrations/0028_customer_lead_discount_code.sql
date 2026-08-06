-- Sticky QR lead discount: assigned once, reused on re-signup so rotating
-- Shopee voucher codes does not issue a new code to the same customer.
alter table customers
  add column if not exists lead_discount_code text;

comment on column customers.lead_discount_code is
  'Discount/voucher code first issued to this QR lead; never overwritten.';
