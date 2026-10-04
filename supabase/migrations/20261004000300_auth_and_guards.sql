-- Cropo: auth helpers, signup trigger and integrity guards.
-- All SECURITY DEFINER functions pin search_path to '' and fully qualify names.

-- ---------------------------------------------------------------------------
-- Role helpers (used by RLS policies). Role comes from the DB, never from JWT metadata.
-- ---------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() = 'ADMIN', false);
$$;

-- True when the statement runs as a trusted backend role (SQL editor, migrations,
-- service role) rather than an end-user JWT.
create or replace function public.is_trusted_backend()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) is null
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '')
         not in ('anon', 'authenticated');
$$;

-- ---------------------------------------------------------------------------
-- Signup: create profile + role profile. Only FARMER or BUYER may self-register.
-- ADMIN is assigned manually (see README).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := upper(coalesce(new.raw_user_meta_data ->> 'role', ''));
  v_full_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_business_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'business_name', '')), '');
begin
  if requested_role not in ('FARMER', 'BUYER') then
    raise exception 'Invalid signup role' using errcode = '22023';
  end if;

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    requested_role::public.user_role,
    left(coalesce(v_full_name, split_part(coalesce(new.email, 'Cropo user'), '@', 1)), 120)
  );

  if requested_role = 'FARMER' then
    insert into public.farmer_profiles (profile_id) values (new.id);
  else
    insert into public.buyer_profiles (profile_id, business_name)
    values (new.id, left(v_business_name, 160));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Profile role is immutable for end users (also enforced by column grants).
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_trusted_backend() then
    raise exception 'Role cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Verification fields: only admins (or trusted backend) may set them.
-- Applies to farmer_profiles, buyer_profiles and farms.
-- ---------------------------------------------------------------------------
create or replace function public.guard_verification_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_backend() then
    return new;
  end if;

  if public.is_admin() then
    if tg_op = 'UPDATE' and new.verification_status is distinct from old.verification_status then
      new.verified_by := case when new.verification_status = 'VERIFIED' then (select auth.uid()) else null end;
      new.verified_at := case when new.verification_status = 'VERIFIED' then now() else null end;
    end if;
    return new;
  end if;

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

create trigger guard_verification_fields
  before insert or update on public.farmer_profiles
  for each row execute function public.guard_verification_fields();
create trigger guard_verification_fields
  before insert or update on public.buyer_profiles
  for each row execute function public.guard_verification_fields();
create trigger guard_verification_fields
  before insert or update on public.farms
  for each row execute function public.guard_verification_fields();

-- ---------------------------------------------------------------------------
-- Listings: a listing's farm must belong to the listing's farmer.
-- ---------------------------------------------------------------------------
create or replace function public.guard_listing_farm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.farm_id is not null and not exists (
    select 1 from public.farms f where f.id = new.farm_id and f.farmer_id = new.farmer_id
  ) then
    raise exception 'Farm does not belong to this farmer' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_listing_farm
  before insert or update of farm_id, farmer_id on public.listings
  for each row execute function public.guard_listing_farm();

-- Max 6 images per listing.
create or replace function public.guard_listing_image_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.listing_images li where li.listing_id = new.listing_id) >= 6 then
    raise exception 'A listing can have at most 6 images' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_listing_image_limit
  before insert on public.listing_images
  for each row execute function public.guard_listing_image_limit();

-- ---------------------------------------------------------------------------
-- Order state machine (DB-enforced). Actor permissions are enforced by the
-- transaction RPCs (Phase 6); this guarantees no path can create an invalid state.
-- ---------------------------------------------------------------------------
create or replace function public.order_transition_allowed(
  from_status public.order_status,
  to_status public.order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (from_status::text, to_status::text) in (
    ('PENDING', 'ACCEPTED'),
    ('PENDING', 'REJECTED'),
    ('PENDING', 'CANCELLED'),
    ('ACCEPTED', 'CONFIRMED'),
    ('ACCEPTED', 'CANCELLED'),
    ('CONFIRMED', 'PREPARING'),
    ('CONFIRMED', 'CANCELLED'),
    ('PREPARING', 'READY_FOR_PICKUP'),
    ('PREPARING', 'IN_TRANSIT'),
    ('PREPARING', 'DISPUTED'),
    ('READY_FOR_PICKUP', 'IN_TRANSIT'),
    ('READY_FOR_PICKUP', 'DELIVERED'),
    ('IN_TRANSIT', 'DELIVERED'),
    ('IN_TRANSIT', 'DISPUTED'),
    ('DELIVERED', 'COMPLETED'),
    ('DELIVERED', 'DISPUTED'),
    ('DISPUTED', 'COMPLETED'),
    ('DISPUTED', 'CANCELLED')
  );
$$;

create or replace function public.guard_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Approved start states: Buy Now -> PENDING; Offer/Request -> ACCEPTED.
    if (new.source = 'BUY_NOW' and new.status <> 'PENDING')
       or (new.source in ('OFFER', 'REQUEST') and new.status <> 'ACCEPTED') then
      raise exception 'Invalid initial status % for % order', new.status, new.source
        using errcode = '23514';
    end if;
  elsif new.status is distinct from old.status
        and not public.order_transition_allowed(old.status, new.status) then
    raise exception 'Invalid order status transition % -> %', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_order_status
  before insert or update of status on public.orders
  for each row execute function public.guard_order_status();

-- Every status change is recorded in order_status_history.
create or replace function public.record_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger record_order_status
  after insert or update of status on public.orders
  for each row execute function public.record_order_status();

-- ---------------------------------------------------------------------------
-- Function privileges: internal functions are not callable through the API.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;
revoke execute on function public.guard_verification_fields() from public, anon, authenticated;
revoke execute on function public.guard_listing_farm() from public, anon, authenticated;
revoke execute on function public.guard_listing_image_limit() from public, anon, authenticated;
revoke execute on function public.guard_order_status() from public, anon, authenticated;
revoke execute on function public.record_order_status() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Helpers are evaluated inside RLS policies, so API roles need EXECUTE.
grant execute on function public.auth_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_trusted_backend() to anon, authenticated;
grant execute on function public.order_transition_allowed(public.order_status, public.order_status) to anon, authenticated;
