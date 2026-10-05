-- Cropo: Pass 3 Remediation — Enforce Buy Now Delivery & Stock Integrity (M6 & H2)
-- 1. Enforce M6 in public.create_buy_now_order: A pickup-only listing MUST NOT allow DELIVERY.
-- 2. Preserve atomic stock reservation and concurrency protection with FOR UPDATE row locks.

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

  -- Lock the listing row for update to ensure serializable, atomic stock reservations
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

  -- M6 Enforcement: Reject DELIVERY if listing is pickup-only
  if p_delivery_method = 'DELIVERY' and not v_listing.delivery_available then
    raise exception 'Delivery is not available for this listing' using errcode = '23514';
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

grant execute on function public.create_buy_now_order(uuid, numeric, public.delivery_method, text, text) to authenticated;
