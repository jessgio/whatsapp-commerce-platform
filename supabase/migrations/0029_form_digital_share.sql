-- Unique public share IDs + optional expiry for library Form Digital templates.

alter table form_templates
  add column if not exists public_slug text,
  add column if not exists expires_at timestamptz;

create unique index if not exists form_templates_public_slug_uidx
  on form_templates (public_slug)
  where public_slug is not null;
