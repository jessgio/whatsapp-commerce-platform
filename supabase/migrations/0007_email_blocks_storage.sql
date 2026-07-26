-- Block-based email designer payload + public asset hosting
alter table email_templates
  add column if not exists blocks jsonb not null default '[]'::jsonb;

-- Public bucket for email banners / inline images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'email-assets',
  'email-assets',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read public assets (email clients need anonymous GET)
create policy email_assets_public_read
  on storage.objects for select
  using (bucket_id = 'email-assets');

-- Staff admins upload/replace/delete via the app (service role also bypasses RLS)
create policy email_assets_admin_insert
  on storage.objects for insert
  with check (bucket_id = 'email-assets' and auth_role() = 'admin');

create policy email_assets_admin_update
  on storage.objects for update
  using (bucket_id = 'email-assets' and auth_role() = 'admin')
  with check (bucket_id = 'email-assets' and auth_role() = 'admin');

create policy email_assets_admin_delete
  on storage.objects for delete
  using (bucket_id = 'email-assets' and auth_role() = 'admin');
