-- Secure public checkout links for WhatsApp cart self-checkout.
alter table orders
  add column if not exists checkout_token text;

alter table orders
  add column if not exists checkout_expires_at timestamptz;

alter table orders
  add column if not exists courier_service text;

create unique index if not exists idx_orders_checkout_token
  on orders (checkout_token)
  where checkout_token is not null;
