-- ---------------------------------------------------------------------------
-- Storage. The old code wrote uploads to local disk via multer, which is
-- incompatible with any ephemeral host - and server/completeimages/ was
-- written to but never served statically, so every post-cleaning image URL
-- was already a hard 404.
--
-- Both buckets are private; the client reads through signed URLs.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('reports',        'reports',        false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('cleanup-proofs', 'cleanup-proofs', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Path convention is {user_id}/{uuid}.jpg. Restricting writes to a user's own
-- prefix is what lets the Edge Function trust the storage_path it is handed:
-- it asserts the prefix matches the caller, and only the caller could have
-- written there.
create policy report_upload_own_prefix on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy report_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy proof_upload_own_prefix on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cleanup-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy proof_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cleanup-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Staff need to see photos for complaints they are responsible for, which are
-- under some citizen's prefix. Signed URLs are minted by the server after an
-- RLS-checked read of the complaint row, so this grants staff bucket reads
-- rather than trying to re-derive complaint ownership from an object path.
create policy staff_read_images on storage.objects
  for select to authenticated
  using (
    bucket_id in ('reports', 'cleanup-proofs')
    and public.current_profile_role() in ('muqaddam', 'si', 'dsi', 'csi', 'admin')
  );
