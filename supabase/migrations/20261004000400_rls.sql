-- Cropo: privileges, Row Level Security and public views.
-- Model: deny by default. Table grants define WHAT an API role may touch (column-level
-- where it matters); RLS policies define WHICH rows. Ownership is always derived from
-- auth.uid(), never from client-supplied IDs.

-- ---------------------------------------------------------------------------
-- 1. Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.farmer_profiles enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.farms enable row level security;
alter table public.crop_categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.offers enable row level security;
alter table public.buying_requests enable row level security;
alter table public.request_offers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_suppliers enable row level security;
alter table public.verification_submissions enable row level security;
alter table public.disputes enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Privileges (reset Supabase defaults, then grant the minimum)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Public (anonymous) read access: marketplace data only.
grant select on public.crop_categories, public.farms, public.listings,
                public.listing_images, public.reviews to anon;

-- Authenticated users may read any table; RLS restricts rows.
grant select on all tables in schema public to authenticated;

grant update (full_name, phone, region, city, avatar_path) on public.profiles to authenticated;
grant update (bio, years_farming, verification_status) on public.farmer_profiles to authenticated;
grant update (business_name, business_type, verification_status) on public.buyer_profiles to authenticated;

grant insert, delete on public.farms to authenticated;
grant update (name, region, district, community, size_hectares, verification_status)
  on public.farms to authenticated;

grant insert, delete on public.crop_categories to authenticated;
grant update (name, slug, sort_order, is_active) on public.crop_categories to authenticated;

grant insert, delete on public.listings to authenticated;
grant update (farm_id, category_id, crop_name, variety, quantity_available, unit, price_per_unit,
              grade, harvest_date, available_date, region, city, description,
              delivery_available, status)
  on public.listings to authenticated;

grant insert, delete on public.listing_images to authenticated;
grant update (sort_order, alt_text) on public.listing_images to authenticated;

grant insert on public.offers to authenticated;

grant insert, delete on public.buying_requests to authenticated;
grant update (category_id, crop_name, quantity, unit, desired_grade, destination_region,
              destination_city, required_by, target_price_per_unit, description, status)
  on public.buying_requests to authenticated;

grant insert on public.request_offers to authenticated;
grant update (quantity, price_per_unit, available_date, message, status)
  on public.request_offers to authenticated;

grant insert, delete on public.reviews to authenticated;

grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

grant insert, delete on public.saved_suppliers to authenticated;

grant insert on public.verification_submissions to authenticated;
grant update (status, review_notes) on public.verification_submissions to authenticated;

grant update (status, resolution) on public.disputes to authenticated;

-- orders, order_items, order_status_history, disputes(insert), notifications(insert):
-- written only by SECURITY DEFINER functions (transaction engine, Phase 6).

-- ---------------------------------------------------------------------------
-- 3. Policies
-- ---------------------------------------------------------------------------

-- profiles ------------------------------------------------------------------
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- farmer_profiles -----------------------------------------------------------
create policy farmer_profiles_select_own_or_admin on public.farmer_profiles
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy farmer_profiles_update_own_or_admin on public.farmer_profiles
  for update to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()))
  with check (profile_id = (select auth.uid()) or (select public.is_admin()));

-- buyer_profiles ------------------------------------------------------------
create policy buyer_profiles_select_own_or_admin on public.buyer_profiles
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy buyer_profiles_update_own_or_admin on public.buyer_profiles
  for update to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()))
  with check (profile_id = (select auth.uid()) or (select public.is_admin()));

-- farms ---------------------------------------------------------------------
create policy farms_select_public on public.farms
  for select to anon, authenticated
  using (true);

create policy farms_insert_own_farmer on public.farms
  for insert to authenticated
  with check (farmer_id = (select auth.uid()) and (select public.auth_role()) = 'FARMER');

create policy farms_update_own_or_admin on public.farms
  for update to authenticated
  using (farmer_id = (select auth.uid()) or (select public.is_admin()))
  with check (farmer_id = (select auth.uid()) or (select public.is_admin()));

create policy farms_delete_own on public.farms
  for delete to authenticated
  using (farmer_id = (select auth.uid()));

-- crop_categories -----------------------------------------------------------
create policy crop_categories_select on public.crop_categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy crop_categories_admin_insert on public.crop_categories
  for insert to authenticated with check ((select public.is_admin()));
create policy crop_categories_admin_update on public.crop_categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy crop_categories_admin_delete on public.crop_categories
  for delete to authenticated using ((select public.is_admin()));

-- listings ------------------------------------------------------------------
create policy listings_select_active_public on public.listings
  for select to anon, authenticated
  using (status = 'ACTIVE');

create policy listings_select_own_or_admin on public.listings
  for select to authenticated
  using (farmer_id = (select auth.uid()) or (select public.is_admin()));

create policy listings_insert_own_farmer on public.listings
  for insert to authenticated
  with check (
    farmer_id = (select auth.uid())
    and (select public.auth_role()) = 'FARMER'
    and status in ('DRAFT', 'ACTIVE')
  );

create policy listings_update_own on public.listings
  for update to authenticated
  using (farmer_id = (select auth.uid()) and status <> 'REMOVED')
  with check (farmer_id = (select auth.uid()) and status <> 'REMOVED');

create policy listings_update_admin on public.listings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy listings_delete_own_unordered on public.listings
  for delete to authenticated
  using (
    farmer_id = (select auth.uid())
    and not exists (select 1 from public.order_items oi where oi.listing_id = listings.id)
  );

create policy listings_delete_admin on public.listings
  for delete to authenticated
  using ((select public.is_admin()));

-- listing_images ------------------------------------------------------------
create policy listing_images_select_visible on public.listing_images
  for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_images.listing_id));

create policy listing_images_insert_owner on public.listing_images
  for insert to authenticated
  with check (
    exists (select 1 from public.listings l
            where l.id = listing_images.listing_id and l.farmer_id = (select auth.uid()))
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
  );

create policy listing_images_update_owner on public.listing_images
  for update to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_images.listing_id and l.farmer_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l
                      where l.id = listing_images.listing_id and l.farmer_id = (select auth.uid())));

create policy listing_images_delete_owner_or_admin on public.listing_images
  for delete to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.listings l
               where l.id = listing_images.listing_id and l.farmer_id = (select auth.uid()))
  );

-- offers --------------------------------------------------------------------
create policy offers_select_parties on public.offers
  for select to authenticated
  using (buyer_id = (select auth.uid()) or farmer_id = (select auth.uid()) or (select public.is_admin()));

create policy offers_insert_buyer on public.offers
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and (select public.auth_role()) = 'BUYER'
    and status = 'PENDING'
    and responded_at is null
    and exists (
      select 1 from public.listings l
      where l.id = offers.listing_id
        and l.status = 'ACTIVE'
        and l.farmer_id = offers.farmer_id
    )
  );

-- buying_requests -----------------------------------------------------------
create policy buying_requests_select on public.buying_requests
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or (select public.is_admin())
    or (status = 'OPEN' and (select public.auth_role()) = 'FARMER')
  );

create policy buying_requests_insert_buyer on public.buying_requests
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and (select public.auth_role()) = 'BUYER'
    and status = 'OPEN'
  );

create policy buying_requests_update_own on public.buying_requests
  for update to authenticated
  using (buyer_id = (select auth.uid()) and status = 'OPEN')
  with check (buyer_id = (select auth.uid()) and status in ('OPEN', 'CLOSED', 'CANCELLED'));

create policy buying_requests_delete_own_unanswered on public.buying_requests
  for delete to authenticated
  using (
    buyer_id = (select auth.uid())
    and not exists (select 1 from public.request_offers ro where ro.request_id = buying_requests.id)
  );

-- request_offers ------------------------------------------------------------
create policy request_offers_select on public.request_offers
  for select to authenticated
  using (
    farmer_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.buying_requests br
               where br.id = request_offers.request_id and br.buyer_id = (select auth.uid()))
  );

create policy request_offers_insert_farmer on public.request_offers
  for insert to authenticated
  with check (
    farmer_id = (select auth.uid())
    and (select public.auth_role()) = 'FARMER'
    and status = 'PENDING'
    and responded_at is null
    and exists (select 1 from public.buying_requests br
                where br.id = request_offers.request_id and br.status = 'OPEN')
    and (
      listing_id is null
      or exists (select 1 from public.listings l
                 where l.id = request_offers.listing_id and l.farmer_id = (select auth.uid()))
    )
  );

create policy request_offers_update_own_pending on public.request_offers
  for update to authenticated
  using (farmer_id = (select auth.uid()) and status = 'PENDING')
  with check (farmer_id = (select auth.uid()) and status in ('PENDING', 'WITHDRAWN'));

-- orders / order_items / order_status_history (read-only via API) -----------
create policy orders_select_parties on public.orders
  for select to authenticated
  using (buyer_id = (select auth.uid()) or farmer_id = (select auth.uid()) or (select public.is_admin()));

create policy order_items_select_parties on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

create policy order_status_history_select_parties on public.order_status_history
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_status_history.order_id));

-- reviews -------------------------------------------------------------------
create policy reviews_select_public on public.reviews
  for select to anon, authenticated
  using (true);

create policy reviews_insert_completed_party on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.status = 'COMPLETED'
        and (
          (o.buyer_id = (select auth.uid()) and reviews.reviewee_id = o.farmer_id)
          or (o.farmer_id = (select auth.uid()) and reviews.reviewee_id = o.buyer_id)
        )
    )
  );

create policy reviews_delete_admin on public.reviews
  for delete to authenticated
  using ((select public.is_admin()));

-- notifications -------------------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- saved_suppliers -----------------------------------------------------------
create policy saved_suppliers_select_own on public.saved_suppliers
  for select to authenticated
  using (buyer_id = (select auth.uid()));

create policy saved_suppliers_insert_own on public.saved_suppliers
  for insert to authenticated
  with check (buyer_id = (select auth.uid()) and (select public.auth_role()) = 'BUYER');

create policy saved_suppliers_delete_own on public.saved_suppliers
  for delete to authenticated
  using (buyer_id = (select auth.uid()));

-- verification_submissions --------------------------------------------------
create policy verification_submissions_select_own_or_admin on public.verification_submissions
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy verification_submissions_insert_own on public.verification_submissions
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'PENDING'
    and reviewer_id is null
    and reviewed_at is null
    and review_notes is null
    and (
      ((select public.auth_role()) = 'FARMER' and type in ('FARMER_IDENTITY', 'FARM'))
      or ((select public.auth_role()) = 'BUYER' and type = 'BUSINESS')
    )
    and (
      farm_id is null
      or exists (select 1 from public.farms f
                 where f.id = verification_submissions.farm_id and f.farmer_id = (select auth.uid()))
    )
    and not exists (
      select 1 from unnest(document_paths) as d(path)
      where split_part(d.path, '/', 1) <> (select auth.uid())::text
    )
  );

create policy verification_submissions_update_admin on public.verification_submissions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- disputes ------------------------------------------------------------------
create policy disputes_select_parties_or_admin on public.disputes
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o where o.id = disputes.order_id)
  );

create policy disputes_update_admin on public.disputes
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 4. Review/dispute bookkeeping set server-side, not by the client
-- ---------------------------------------------------------------------------
create or replace function public.stamp_reviewer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'verification_submissions' then
    if new.status is distinct from old.status then
      new.reviewer_id := (select auth.uid());
      new.reviewed_at := now();
    end if;
  elsif tg_table_name = 'disputes' then
    if new.status in ('RESOLVED', 'CLOSED') and old.status not in ('RESOLVED', 'CLOSED') then
      new.resolved_by := (select auth.uid());
      new.resolved_at := now();
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_reviewer() from public, anon, authenticated;

create trigger stamp_reviewer before update on public.verification_submissions
  for each row execute function public.stamp_reviewer();
create trigger stamp_reviewer before update on public.disputes
  for each row execute function public.stamp_reviewer();

-- ---------------------------------------------------------------------------
-- 5. Public profile views (expose only non-sensitive columns; no phone numbers)
-- These intentionally run with the view owner's rights so that public pages can show
-- farmer names/verification without opening the profiles table itself.
-- ---------------------------------------------------------------------------
create view public.public_farmer_profiles
with (security_barrier = true) as
select
  p.id,
  p.full_name,
  p.region,
  p.city,
  p.avatar_path,
  fp.bio,
  fp.years_farming,
  fp.verification_status,
  p.created_at
from public.profiles p
join public.farmer_profiles fp on fp.profile_id = p.id
where p.role = 'FARMER';

create view public.public_buyer_profiles
with (security_barrier = true) as
select
  p.id,
  p.full_name,
  p.region,
  p.city,
  bp.business_name,
  bp.business_type,
  bp.verification_status
from public.profiles p
join public.buyer_profiles bp on bp.profile_id = p.id
where p.role = 'BUYER';

revoke all on public.public_farmer_profiles, public.public_buyer_profiles from anon, authenticated;
grant select on public.public_farmer_profiles to anon, authenticated;
grant select on public.public_buyer_profiles to authenticated;
