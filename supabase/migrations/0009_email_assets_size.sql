-- Allow larger professionally edited email banners (up to 15 MB)
update storage.buckets
set file_size_limit = 15728640
where id = 'email-assets';
