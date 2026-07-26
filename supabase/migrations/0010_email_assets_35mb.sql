-- Allow up to 35 MB for professionally edited email banners
update storage.buckets
set file_size_limit = 36700160
where id = 'email-assets';
