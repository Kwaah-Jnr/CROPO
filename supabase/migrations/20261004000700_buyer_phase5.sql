-- Cropo: Phase 5 Commercial Buyer Dashboard, Offers & Order Flow
-- Enables secure atomic operations for Buy Now, Offer negotiations, and Request Offer conversions.

-- 1. Grants for Offer updates
grant update (status, responded_at) on public.offers to authenticated;

-- Farmers can accept/reject pending offers on their listings
create policy offers_update_farmer on public.offers
  for update to authenticated
  using (farmer_id = (select auth.uid()) and status = 'PENDING')
  with check (farmer_id = (select auth.uid()) and status in ('ACCEPTED', 'REJECTED'));

-- Buyers can withdraw their own pending offers
create policy offers_update_buyer on public.offers
  for update to authenticated
  using (buyer_id = (select auth.uid()) and status = 'PENDING')
  with check (buyer_id = (select auth.uid()) and status = 'WITHDRAWN');

-- 2. Grants for Request Offers updates by buyers
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
    and status in ('ACCEPTED', 'REJECTED')
  );

-- 3. Atomic Order Creation Functions (Security Definer)

-- 3A. Buy Now Order Creation
create or replace function public.create_buy_now_order(
  p_listing_id uuid,
  p_quantity numeric,
  p_delivery_method public.delivery_method default 'PICKUP',
  p_delivery_address text default null,
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role public.user_role;
  v_listing record;
  v_subtotal numeric(14, 2);
  v_order_id uuid;
  v_order_number text;
begin
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'BUYER' then
    raise exception 'Only registered buyers can place Buy Now orders' using errcode = '42501';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero' using errcode = '22003';
  end if;

  if p_delivery_method = 'DELIVERY' and (p_delivery_address is null or btrim(p_delivery_address) = '') then
    raise exception 'Delivery address is required when delivery method is DELIVERY' using errcode = '23514';
  end if;

  -- Lock the listing row for update
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'ACTIVE' then
    raise exception 'Produce listing is no longer active' using errcode = '23514';
  end if;

  if v_listing.farmer_id = v_caller_id then
    raise exception 'Farmers cannot purchase their own produce listings' using errcode = '42501';
  end if;

  if p_quantity > v_listing.quantity_available then
    raise exception 'Requested quantity exceeds available volume (% %)',
      v_listing.quantity_available, v_listing.unit using errcode = '22003';
  end if;

  v_subtotal := round(p_quantity * v_listing.price_per_unit, 2);

  -- Insert Order (source = 'BUY_NOW', status = 'PENDING')
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
    v_listing.farmer_id,
    'BUY_NOW',
    null,
    null,
    'PENDING',
    v_subtotal,
    'GHS',
    p_delivery_method,
    p_delivery_address,
    p_notes
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
    p_quantity,
    v_listing.price_per_unit
  );

  -- Decrement available quantity and mark SOLD_OUT if depleted
  update public.listings
  set quantity_available = quantity_available - p_quantity,
      status = case when quantity_available - p_quantity <= 0 then 'SOLD_OUT'::public.listing_status else status end,
      updated_at = now()
  where id = v_listing.id;

  return json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal
  );
end;
$$;

-- 3B. Accept Offer and Create Order
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

  -- Decrement listing quantity
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

-- 3C. Accept Request Offer and Create Order
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
  v_ro record;
  v_request record;
  v_subtotal numeric(14, 2);
  v_order_id uuid;
  v_order_number text;
  v_dest text;
begin
  v_caller_id := (select auth.uid());
  if v_caller_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_ro from public.request_offers where id = p_request_offer_id for update;
  if not found then
    raise exception 'Supplier offer not found' using errcode = 'P0002';
  end if;

  if v_ro.status <> 'PENDING' then
    raise exception 'Supplier offer is not pending' using errcode = '23514';
  end if;

  select * into v_request from public.buying_requests where id = v_ro.request_id for update;
  if not found then
    raise exception 'Buying request not found' using errcode = 'P0002';
  end if;

  if v_request.buyer_id <> v_caller_id then
    raise exception 'Only the buyer who posted this request can accept offers' using errcode = '42501';
  end if;

  -- Update request offer
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

-- 4. Permissions
grant execute on function public.create_buy_now_order(uuid, numeric, public.delivery_method, text, text) to authenticated;
grant execute on function public.accept_offer_and_create_order(uuid) to authenticated;
grant execute on function public.accept_request_offer_and_create_order(uuid) to authenticated;
