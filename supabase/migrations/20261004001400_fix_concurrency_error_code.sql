-- ============================================================================
-- Migration: 20261004001400_fix_concurrency_error_code.sql
-- Description: Use P0001 instead of 40001 so PostgREST does not enter endless retry loop
-- ============================================================================

drop function if exists public.update_farmer_listing;
create or replace function public.update_farmer_listing(
  p_listing_id uuid,
  p_expected_version integer default null,
  p_farm_id uuid default null,
  p_category_id uuid default null,
  p_crop_name text default null,
  p_variety text default null,
  p_quantity_available numeric default null,
  p_unit public.produce_unit default null,
  p_price_per_unit numeric default null,
  p_grade public.produce_grade default 'UNGRADED',
  p_harvest_date date default null,
  p_available_date date default null,
  p_region text default null,
  p_city text default null,
  p_description text default null,
  p_delivery_available boolean default false,
  p_status public.listing_status default 'ACTIVE'
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_listing record;
begin
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  if v_listing.farmer_id <> v_caller_id and not public.is_admin() then
    raise exception 'Only the listing owner or an administrator can update this listing'
      using errcode = '42501';
  end if;

  if v_listing.status = 'REMOVED' then
    raise exception 'Cannot modify a removed listing' using errcode = '23514';
  end if;

  -- Optimistic concurrency check to prevent lost updates (M1)
  if p_expected_version is not null and v_listing.version <> p_expected_version then
    raise exception 'Listing has been modified by another transaction (current version: %, expected: %). Please reload before updating.',
      v_listing.version, p_expected_version
      using errcode = 'P0001';
  end if;

  -- Soft removal must go through remove_farmer_listing
  if p_status = 'REMOVED' then
    raise exception 'Use remove_farmer_listing to remove a listing' using errcode = '23514';
  end if;

  -- Verify farm belongs to farmer if provided
  if p_farm_id is not null then
    if not exists (select 1 from public.farms f where f.id = p_farm_id and f.farmer_id = v_listing.farmer_id) then
      raise exception 'Farm does not belong to the listing farmer' using errcode = '42501';
    end if;
  end if;

  update public.listings
  set farm_id = p_farm_id,
      category_id = coalesce(p_category_id, category_id),
      crop_name = coalesce(p_crop_name, crop_name),
      variety = p_variety,
      quantity_available = coalesce(p_quantity_available, quantity_available),
      unit = coalesce(p_unit, unit),
      price_per_unit = coalesce(p_price_per_unit, price_per_unit),
      grade = coalesce(p_grade, grade),
      harvest_date = p_harvest_date,
      available_date = p_available_date,
      region = coalesce(p_region, region),
      city = p_city,
      description = p_description,
      delivery_available = coalesce(p_delivery_available, delivery_available),
      status = coalesce(p_status, status)
  where id = p_listing_id;

  select * into v_listing from public.listings where id = p_listing_id;

  return json_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'version', v_listing.version,
    'quantity_available', v_listing.quantity_available,
    'status', v_listing.status
  );
end;
$$;

revoke execute on function public.update_farmer_listing from public, anon;
grant execute on function public.update_farmer_listing to authenticated;
