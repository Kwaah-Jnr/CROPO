-- ============================================================================
-- Migration: 20261004001000_farmer_verification_workflow.sql
-- Description: Complete Farmer Verification Workflow (Remediation Pass 4 / M2)
-- Enforces:
-- 1. Farmers cannot self-verify (guard_verification_fields).
-- 2. State transition synchronization: UNVERIFIED -> PENDING -> VERIFIED / REJECTED.
-- 3. Document presence constraint on verification_submissions.
-- 4. Admin review authorization & RPC for verification reviews.
-- ============================================================================

-- 1. Ensure verification_submissions requires at least one document
alter table public.verification_submissions
  drop constraint if exists verification_submissions_has_documents;

alter table public.verification_submissions
  add constraint verification_submissions_has_documents
  check (cardinality(document_paths) >= 1);

-- 2. Update guard_verification_fields to support internal synchronization
-- while strictly preventing non-admin clients from modifying verification status
create or replace function public.guard_verification_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Trusted backend (migrations, seed scripts) bypasses checks
  if public.is_trusted_backend() then
    return new;
  end if;

  -- System trigger synchronization bypasses client restrictions
  if current_setting('cropo.internal_verification_sync', true) = 'true' then
    return new;
  end if;

  -- Administrators are authorized to update verification status and fields
  if public.is_admin() then
    if tg_op = 'UPDATE' and new.verification_status is distinct from old.verification_status then
      new.verified_by := case when new.verification_status = 'VERIFIED' then (select auth.uid()) else null end;
      new.verified_at := case when new.verification_status = 'VERIFIED' then now() else null end;
    end if;
    return new;
  end if;

  -- Non-admin clients: cannot self-verify or modify any verification standing
  if tg_op = 'INSERT' then
    new.verification_status := 'UNVERIFIED';
    new.verified_at := null;
    new.verified_by := null;
  elsif new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by then
    raise exception 'Verification fields can only be changed by an administrator'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- 3. Synchronize verification_submissions lifecycle to profile/farm verification standing
create or replace function public.sync_verification_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_setting text := current_setting('cropo.internal_verification_sync', true);
begin
  -- Enable internal sync mode for this transaction
  perform set_config('cropo.internal_verification_sync', 'true', true);

  if tg_op = 'INSERT' then
    if new.status = 'PENDING' then
      if new.type = 'FARMER_IDENTITY' then
        update public.farmer_profiles
        set verification_status = 'PENDING'
        where profile_id = new.profile_id
          and verification_status in ('UNVERIFIED', 'REJECTED');
      elsif new.type = 'FARM' then
        update public.farms
        set verification_status = 'PENDING'
        where id = new.farm_id
          and verification_status in ('UNVERIFIED', 'REJECTED');

        update public.farmer_profiles
        set verification_status = 'PENDING'
        where profile_id = new.profile_id
          and verification_status in ('UNVERIFIED', 'REJECTED');
      elsif new.type = 'BUSINESS' then
        update public.buyer_profiles
        set verification_status = 'PENDING'
        where profile_id = new.profile_id
          and verification_status in ('UNVERIFIED', 'REJECTED');
      end if;
    end if;

  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'APPROVED' then
      if new.type = 'FARMER_IDENTITY' then
        update public.farmer_profiles
        set verification_status = 'VERIFIED',
            verified_by = new.reviewer_id,
            verified_at = coalesce(new.reviewed_at, now())
        where profile_id = new.profile_id;
      elsif new.type = 'FARM' then
        update public.farms
        set verification_status = 'VERIFIED',
            verified_by = new.reviewer_id,
            verified_at = coalesce(new.reviewed_at, now())
        where id = new.farm_id;
      elsif new.type = 'BUSINESS' then
        update public.buyer_profiles
        set verification_status = 'VERIFIED',
            verified_by = new.reviewer_id,
            verified_at = coalesce(new.reviewed_at, now())
        where profile_id = new.profile_id;
      end if;

    elsif new.status = 'REJECTED' then
      if new.type = 'FARMER_IDENTITY' then
        update public.farmer_profiles
        set verification_status = 'REJECTED',
            verified_by = null,
            verified_at = null
        where profile_id = new.profile_id;
      elsif new.type = 'FARM' then
        update public.farms
        set verification_status = 'REJECTED',
            verified_by = null,
            verified_at = null
        where id = new.farm_id;
      elsif new.type = 'BUSINESS' then
        update public.buyer_profiles
        set verification_status = 'REJECTED',
            verified_by = null,
            verified_at = null
        where profile_id = new.profile_id;
      end if;
    end if;
  end if;

  -- Restore previous setting
  perform set_config('cropo.internal_verification_sync', coalesce(v_old_setting, ''), true);
  return new;
end;
$$;

revoke execute on function public.sync_verification_submission() from public, anon, authenticated;

drop trigger if exists sync_verification_submission on public.verification_submissions;
create trigger sync_verification_submission
  after insert or update of status on public.verification_submissions
  for each row execute function public.sync_verification_submission();

-- 4. Admin RPC to review verification submissions
create or replace function public.admin_review_verification_submission(
  p_submission_id uuid,
  p_status public.submission_status,
  p_review_notes text default null
)
returns public.verification_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.verification_submissions;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can review verification submissions'
      using errcode = '42501';
  end if;

  if p_status not in ('APPROVED', 'REJECTED') then
    raise exception 'Invalid verification review status. Must be APPROVED or REJECTED'
      using errcode = '22023';
  end if;

  update public.verification_submissions
  set status = p_status,
      review_notes = p_review_notes,
      reviewer_id = (select auth.uid()),
      reviewed_at = now(),
      updated_at = now()
  where id = p_submission_id
  returning * into v_submission;

  if not found then
    raise exception 'Verification submission not found' using errcode = 'P0002';
  end if;

  return v_submission;
end;
$$;

revoke execute on function public.admin_review_verification_submission(uuid, public.submission_status, text) from public, anon;
grant execute on function public.admin_review_verification_submission(uuid, public.submission_status, text) to authenticated;
