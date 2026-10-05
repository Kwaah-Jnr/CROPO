-- Cropo: Pass 1 Remediation — Harden Offers & Request Offers (H3 & H4)
-- 1. Restrict update grants on request_offers so no user can mutate quantity/price.
-- 2. Restrict RLS policies so status transitions to ACCEPTED cannot be done directly via PostgREST.
-- 3. Harden accept_request_offer_and_create_order with request OPEN check, competing quote rejection, and listing stock lock/deduction.

-- ============================================================================
-- 1. Tighten Column Grants on request_offers
-- ============================================================================
revoke update on public.request_offers from authenticated;
grant update (status, responded_at) on public.request_offers to authenticated;

-- ============================================================================
-- 2. Restrict Direct RLS Update Policies (Force Acceptance Through RPCs)
-- ============================================================================

-- A. offers: Farmers can only directly decline (REJECTED) offers. Acceptance MUST go through accept_offer_and_create_order().
drop policy if exists offers_update_farmer on public.offers;
create policy offers_update_farmer on public.offers
  for update to authenticated
  using (farmer_id = (select auth.uid()) and status = 'PENDING')
  with check (farmer_id = (select auth.uid()) and status = 'REJECTED');

-- B. request_offers: Farmers can only withdraw their own pending quotes.
drop policy if exists request_offers_update_own_pending on public.request_offers;
create policy request_offers_update_own_pending on public.request_offers
  for update to authenticated
  using (farmer_id = (select auth.uid()) and status = 'PENDING')
  with check (farmer_id = (select auth.uid()) and status = 'WITHDRAWN');

-- C. request_offers: Buyers can only directly decline (REJECTED) quotes. Acceptance MUST go through accept_request_offer_and_create_order().
drop policy if exists request_offers_update_buyer on public.request_offers;
create policy request_offers_update_buyer on public.request_offers
  for update to authenticated
  using (
    exists (
      select 1 from public.buying_requests br
      where br.id = request_offers.request_id and br.buyer_id = (select auth.uid())
    )
    and status = 'PENDING'
  )
  with check (
    exists (
      select 1 from public.buying_requests br
      where br.id = request_offers.request_id and br.buyer_id = (select auth.uid())
    )
    and status = 'REJECTED'
  );

-- ============================================================================
-- 3. Harden accept_offer_and_create_order (Listing ACTIVE validation)
-- ============================================================================
create or replace function public.accept_offer_and_create_order(
  p_offer_id uuid
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_offer record;
  v_listing record;
  v_subtotal numeric(14, 2);
  v_order_id uuid;
  v_order_number text;
begin
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  if v_offer.farmer_id <> v_caller_id then
    raise exception 'Only the listing farmer can accept this offer' using errcode = '42501';
  end if;

  if v_offer.status <> 'PENDING' then
    raise exception 'Offer is not pending (current status: %)', v_offer.status using errcode = '23514';
  end if;

  select * into v_listing from public.listings where id = v_offer.listing_id for update;
  if not found then
    raise exception 'Associated listing not found' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'ACTIVE' then
    raise exception 'Produce listing is no longer active (current status: %)', v_listing.status using errcode = '23514';
  end if;

  if v_listing.quantity_available < v_offer.quantity then
    raise exception 'Insufficient stock available to fulfill offer' using errcode = '22003';
  end if;

  -- Update offer status
  update public.offers
  set status = 'ACCEPTED',
      responded_at = now(),
      updated_at = now()
  where id = v_offer.id;

  v_subtotal := round(v_offer.quantity * v_offer.price_per_unit, 2);

  -- Insert Order (source = 'OFFER', status = 'ACCEPTED')
  insert into public.orders (
    buyer_id,
    farmer_id,
    source,
    offer_id,
    request_offer_id,
    status,
    subtotal,
    currency,
    delivery_method,
    delivery_address,
    notes
  )
  values (
    v_offer.buyer_id,
    v_offer.farmer_id,
    'OFFER',
    v_offer.id,
    null,
    'ACCEPTED',
    v_subtotal,
    'GHS',
    'PICKUP',
    null,
    concat('Order created from accepted offer #', substring(v_offer.id::text from 1 for 8))
  )
  returning id, order_number into v_order_id, v_order_number;

  -- Insert Order Item
  insert into public.order_items (
    order_id,
    listing_id,
    crop_name,
    unit,
    quantity,
    price_per_unit
  )
  values (
    v_order_id,
    v_listing.id,
    v_listing.crop_name,
    v_listing.unit,
    v_offer.quantity,
    v_offer.price_per_unit
  );

  -- Decrement listing quantity and mark SOLD_OUT if depleted
  update public.listings
  set quantity_available = quantity_available - v_offer.quantity,
      status = case when quantity_available - v_offer.quantity <= 0 then 'SOLD_OUT'::public.listing_status else status end,
      updated_at = now()
  where id = v_listing.id;

  return json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal
  );
end;
$$;

-- ============================================================================
-- 4. Harden accept_request_offer_and_create_order (H4 Requirements)
-- ============================================================================
create or replace function public.accept_request_offer_and_create_order(
  p_request_offer_id uuid
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role public.user_role;
  v_ro record;
  v_request record;
  v_listing record;
  v_subtotal numeric(14, 2);
  v_order_id uuid;
  v_order_number text;
  v_dest text;
begin
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'BUYER' then
    raise exception 'Only registered buyers can accept supplier quotes' using errcode = '42501';
  end if;

  -- Lock the request offer row
  select * into v_ro from public.request_offers where id = p_request_offer_id for update;
  if not found then
    raise exception 'Supplier offer not found' using errcode = 'P0002';
  end if;

  if v_ro.status <> 'PENDING' then
    raise exception 'Supplier offer is not pending (current status: %)', v_ro.status using errcode = '23514';
  end if;

  -- Lock the buying request row
  select * into v_request from public.buying_requests where id = v_ro.request_id for update;
  if not found then
    raise exception 'Buying request not found' using errcode = 'P0002';
  end if;

  if v_request.buyer_id <> v_caller_id then
    raise exception 'Only the buyer who posted this request can accept offers' using errcode = '42501';
  end if;

  -- H4.1: Require the buying request to still be OPEN (prevents accepting twice or on cancelled/fulfilled requests)
  if v_request.status <> 'OPEN' then
    raise exception 'Buying request is no longer open (current status: %)', v_request.status using errcode = '23514';
  end if;

  -- H4.2: If quote is linked to an active listing, lock, validate available stock, and decrement atomically
  if v_ro.listing_id is not null then
    select * into v_listing from public.listings where id = v_ro.listing_id for update;
    if not found then
      raise exception 'Referenced produce listing not found' using errcode = 'P0002';
    end if;

    if v_listing.status <> 'ACTIVE' then
      raise exception 'Referenced produce listing is no longer active (current status: %)', v_listing.status using errcode = '23514';
    end if;

    if v_listing.quantity_available < v_ro.quantity then
      raise exception 'Insufficient stock available in referenced listing (% % available, % required)',
        v_listing.quantity_available, v_listing.unit, v_ro.quantity using errcode = '22003';
    end if;

    -- Atomically decrement listing stock and mark SOLD_OUT if depleted
    update public.listings
    set quantity_available = quantity_available - v_ro.quantity,
        status = case when quantity_available - v_ro.quantity <= 0 then 'SOLD_OUT'::public.listing_status else status end,
        updated_at = now()
    where id = v_listing.id;
  end if;

  -- Update accepted request offer
  update public.request_offers
  set status = 'ACCEPTED',
      responded_at = now(),
      updated_at = now()
  where id = v_ro.id;

  -- Mark buying request fulfilled
  update public.buying_requests
  set status = 'FULFILLED',
      updated_at = now()
  where id = v_request.id;

  -- H4.3: Reject all competing pending quotes for this buying request so none stay incorrectly pending
  update public.request_offers
  set status = 'REJECTED',
      responded_at = now(),
      updated_at = now()
  where request_id = v_request.id
    and id <> v_ro.id
    and status = 'PENDING';

  v_subtotal := round(v_ro.quantity * v_ro.price_per_unit, 2);
  v_dest := coalesce(v_request.destination_city || ', ', '') || v_request.destination_region || ' Region';

  -- Insert Order (source = 'REQUEST', status = 'ACCEPTED')
  insert into public.orders (
    buyer_id,
    farmer_id,
    source,
    offer_id,
    request_offer_id,
    status,
    subtotal,
    currency,
    delivery_method,
    delivery_address,
    notes
  )
  values (
    v_caller_id,
    v_ro.farmer_id,
    'REQUEST',
    null,
    v_ro.id,
    'ACCEPTED',
    v_subtotal,
    'GHS',
    'DELIVERY',
    v_dest,
    concat('Order created from Buying Request: ', v_request.crop_name)
  )
  returning id, order_number into v_order_id, v_order_number;

  -- Insert Order Item
  insert into public.order_items (
    order_id,
    listing_id,
    crop_name,
    unit,
    quantity,
    price_per_unit
  )
  values (
    v_order_id,
    v_ro.listing_id,
    v_request.crop_name,
    v_request.unit,
    v_ro.quantity,
    v_ro.price_per_unit
  );

  return json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal
  );
end;
$$;

-- Ensure execute permissions
grant execute on function public.accept_offer_and_create_order(uuid) to authenticated;
grant execute on function public.accept_request_offer_and_create_order(uuid) to authenticated;
