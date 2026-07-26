-- Prefer Google OAuth full_name when creating staff profiles.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'sales')
  )
  on conflict (id) do nothing;
  return new;
end $$;
