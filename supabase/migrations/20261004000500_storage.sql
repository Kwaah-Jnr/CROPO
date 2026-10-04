-- Cropo: Supabase Storage buckets and object policies.
-- Every object path starts with the owner's user id: {auth.uid()}/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760,
     array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- listing-images: public read via public URL; farmers write only inside their folder.
create policy "listing_images_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "listing_images_farmer_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.auth_role()) = 'FARMER'
  );

create policy "listing_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "listing_images_owner_or_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- avatars: public read via public URL; any user writes only inside their folder.
create policy "avatars_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- verification-documents: private. Owner uploads/reads own; admins read all (signed URLs).
-- No update/delete for owners so submitted evidence cannot be altered.
create policy "verification_docs_owner_or_admin_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "verification_docs_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
