-- Campaign dispatch: failure tracking + failed status for the schedule worker.

alter table campaigns
  add column if not exists error_count integer not null default 0;

alter table campaigns
  add column if not exists last_error text;

alter table campaigns drop constraint if exists campaigns_status_check;
alter table campaigns
  add constraint campaigns_status_check
  check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'));
