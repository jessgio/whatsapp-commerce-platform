-- Secret token for public “revise your info” links (no discount re-issue)
alter table customers
  add column if not exists edit_token text;

create unique index if not exists idx_customers_edit_token
  on customers (edit_token)
  where edit_token is not null;
