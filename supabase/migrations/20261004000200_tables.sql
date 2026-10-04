-- Cropo: core tables.
-- Conventions: uuid PKs, created_at/updated_at on every table, money numeric(12,2) in GHS,
-- positive quantity/price checks, FK indexes.

-- ---------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null,
  full_name   text not null check (char_length(btrim(full_name)) between 1 and 120),
  phone       text check (phone is null or phone ~ '^\+?[0-9][0-9 ]{6,19}$'),
  region      text check (region is null or char_length(region) <= 60),
  city        text check (city is null or char_length(city) <= 80),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

create table public.farmer_profiles (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  bio                 text check (bio is null or char_length(bio) <= 2000),
  years_farming       smallint check (years_farming is null or years_farming between 0 and 100),
  verification_status public.verification_status not null default 'UNVERIFIED',
  verified_at         timestamptz,
  verified_by         uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index farmer_profiles_verification_idx on public.farmer_profiles (verification_status);
create index farmer_profiles_verified_by_idx on public.farmer_profiles (verified_by);

create table public.buyer_profiles (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  business_name       text check (business_name is null or char_length(btrim(business_name)) between 1 and 160),
  business_type       public.business_type not null default 'INDIVIDUAL',
  verification_status public.verification_status not null default 'UNVERIFIED',
  verified_at         timestamptz,
  verified_by         uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index buyer_profiles_verification_idx on public.buyer_profiles (verification_status);
create index buyer_profiles_verified_by_idx on public.buyer_profiles (verified_by);

-- ---------------------------------------------------------------------------
-- Farms
-- ---------------------------------------------------------------------------
create table public.farms (
  id                  uuid primary key default gen_random_uuid(),
  farmer_id           uuid not null references public.farmer_profiles (profile_id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 160),
  region              text not null check (char_length(region) between 1 and 60),
  district            text check (district is null or char_length(district) <= 80),
  community           text check (community is null or char_length(community) <= 80),
  size_hectares       numeric(10, 2) check (size_hectares is null or size_hectares > 0),
  verification_status public.verification_status not null default 'UNVERIFIED',
  verified_at         timestamptz,
  verified_by         uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index farms_farmer_id_idx on public.farms (farmer_id);
create index farms_verified_by_idx on public.farms (verified_by);

-- ---------------------------------------------------------------------------
-- Crop categories (admin-managed)
-- ---------------------------------------------------------------------------
create table public.crop_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(btrim(name)) between 1 and 80),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
create table public.listings (
  id                 uuid primary key default gen_random_uuid(),
  farmer_id          uuid not null references public.farmer_profiles (profile_id) on delete cascade,
  farm_id            uuid references public.farms (id) on delete set null,
  category_id        uuid not null references public.crop_categories (id) on delete restrict,
  crop_name          text not null check (char_length(btrim(crop_name)) between 1 and 120),
  variety            text check (variety is null or char_length(variety) <= 120),
  quantity_available numeric(12, 2) not null check (quantity_available >= 0),
  unit               public.produce_unit not null,
  price_per_unit     numeric(12, 2) not null check (price_per_unit > 0),
  currency           char(3) not null default 'GHS' check (currency = 'GHS'),
  grade              public.produce_grade not null default 'UNGRADED',
  harvest_date       date,
  available_date     date,
  region             text not null check (char_length(region) between 1 and 60),
  city               text check (city is null or char_length(city) <= 80),
  description        text check (description is null or char_length(description) <= 4000),
  delivery_available boolean not null default false,
  status             public.listing_status not null default 'DRAFT',
  search             tsvector generated always as (
                       setweight(to_tsvector('simple', coalesce(crop_name, '')), 'A') ||
                       setweight(to_tsvector('simple', coalesce(variety, '')), 'B') ||
                       setweight(to_tsvector('simple', coalesce(city, '') || ' ' || coalesce(region, '')), 'C') ||
                       setweight(to_tsvector('simple', coalesce(description, '')), 'D')
                     ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint listings_active_has_stock check (status <> 'ACTIVE' or quantity_available > 0)
);
create index listings_farmer_id_idx on public.listings (farmer_id);
create index listings_farm_id_idx on public.listings (farm_id);
create index listings_status_category_idx on public.listings (status, category_id);
create index listings_region_idx on public.listings (region);
create index listings_price_idx on public.listings (price_per_unit);
create index listings_created_at_idx on public.listings (created_at desc);
create index listings_search_idx on public.listings using gin (search);

create table public.listing_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 300),
  sort_order   smallint not null default 0 check (sort_order between 0 and 20),
  alt_text     text check (alt_text is null or char_length(alt_text) <= 200),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index listing_images_listing_id_idx on public.listing_images (listing_id, sort_order);

-- ---------------------------------------------------------------------------
-- Offers (Make Offer on a listing)
-- ---------------------------------------------------------------------------
create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings (id) on delete restrict,
  buyer_id       uuid not null references public.buyer_profiles (profile_id) on delete cascade,
  farmer_id      uuid not null references public.farmer_profiles (profile_id) on delete cascade,
  quantity       numeric(12, 2) not null check (quantity > 0),
  price_per_unit numeric(12, 2) not null check (price_per_unit > 0),
  message        text check (message is null or char_length(message) <= 1000),
  status         public.offer_status not null default 'PENDING',
  responded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index offers_listing_id_idx on public.offers (listing_id);
create index offers_farmer_status_idx on public.offers (farmer_id, status);
create index offers_buyer_status_idx on public.offers (buyer_id, status);

-- ---------------------------------------------------------------------------
-- Buying requests (reverse demand)
-- ---------------------------------------------------------------------------
create table public.buying_requests (
  id                    uuid primary key default gen_random_uuid(),
  buyer_id              uuid not null references public.buyer_profiles (profile_id) on delete cascade,
  category_id           uuid references public.crop_categories (id) on delete set null,
  crop_name             text not null check (char_length(btrim(crop_name)) between 1 and 120),
  quantity              numeric(12, 2) not null check (quantity > 0),
  unit                  public.produce_unit not null,
  desired_grade         public.produce_grade,
  destination_region    text not null check (char_length(destination_region) between 1 and 60),
  destination_city      text check (destination_city is null or char_length(destination_city) <= 80),
  required_by           date,
  target_price_per_unit numeric(12, 2) check (target_price_per_unit is null or target_price_per_unit > 0),
  currency              char(3) not null default 'GHS' check (currency = 'GHS'),
  description           text check (description is null or char_length(description) <= 4000),
  status                public.request_status not null default 'OPEN',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index buying_requests_buyer_id_idx on public.buying_requests (buyer_id);
create index buying_requests_category_id_idx on public.buying_requests (category_id);
create index buying_requests_status_required_idx on public.buying_requests (status, required_by);

create table public.request_offers (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.buying_requests (id) on delete restrict,
  farmer_id      uuid not null references public.farmer_profiles (profile_id) on delete cascade,
  listing_id     uuid references public.listings (id) on delete set null,
  quantity       numeric(12, 2) not null check (quantity > 0),
  price_per_unit numeric(12, 2) not null check (price_per_unit > 0),
  available_date date,
  message        text check (message is null or char_length(message) <= 1000),
  status         public.offer_status not null default 'PENDING',
  responded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index request_offers_request_id_idx on public.request_offers (request_id);
create index request_offers_farmer_status_idx on public.request_offers (farmer_id, status);
create index request_offers_listing_id_idx on public.request_offers (listing_id);
-- One live (pending) response per farmer per request.
create unique index request_offers_one_pending_per_farmer
  on public.request_offers (request_id, farmer_id) where status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique
                     default ('CRP-' || lpad(nextval('public.order_number_seq')::text, 7, '0')),
  buyer_id         uuid not null references public.buyer_profiles (profile_id) on delete restrict,
  farmer_id        uuid not null references public.farmer_profiles (profile_id) on delete restrict,
  source           public.order_source not null,
  offer_id         uuid unique references public.offers (id) on delete restrict,
  request_offer_id uuid unique references public.request_offers (id) on delete restrict,
  status           public.order_status not null,
  subtotal         numeric(14, 2) not null check (subtotal >= 0),
  currency         char(3) not null default 'GHS' check (currency = 'GHS'),
  delivery_method  public.delivery_method not null default 'PICKUP',
  delivery_address text check (delivery_address is null or char_length(delivery_address) <= 500),
  notes            text check (notes is null or char_length(notes) <= 1000),
  cancel_reason    text check (cancel_reason is null or char_length(cancel_reason) <= 1000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_source_reference check (
    (source = 'BUY_NOW' and offer_id is null and request_offer_id is null) or
    (source = 'OFFER'   and offer_id is not null and request_offer_id is null) or
    (source = 'REQUEST' and request_offer_id is not null and offer_id is null)
  ),
  constraint orders_delivery_address_required check (
    delivery_method <> 'DELIVERY' or delivery_address is not null
  )
);
alter sequence public.order_number_seq owned by public.orders.order_number;
create index orders_buyer_status_idx on public.orders (buyer_id, status);
create index orders_farmer_status_idx on public.orders (farmer_id, status);
create index orders_created_at_idx on public.orders (created_at desc);

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  listing_id     uuid references public.listings (id) on delete set null,
  crop_name      text not null,
  unit           public.produce_unit not null,
  quantity       numeric(12, 2) not null check (quantity > 0),
  price_per_unit numeric(12, 2) not null check (price_per_unit > 0),
  line_total     numeric(14, 2) generated always as (round(quantity * price_per_unit, 2)) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_listing_id_idx on public.order_items (listing_id);

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  note        text check (note is null or char_length(note) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);
create index order_status_history_changed_by_idx on public.order_status_history (changed_by);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint reviews_one_per_party unique (order_id, reviewer_id),
  constraint reviews_not_self check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id);
create index reviews_reviewer_idx on public.reviews (reviewer_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  title      text not null check (char_length(title) between 1 and 200),
  body       text check (body is null or char_length(body) <= 1000),
  link       text check (link is null or link ~ '^/'),
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_read_idx on public.notifications (user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- Approved additional tables
-- ---------------------------------------------------------------------------
create table public.saved_suppliers (
  id         uuid primary key default gen_random_uuid(),
  buyer_id   uuid not null references public.buyer_profiles (profile_id) on delete cascade,
  farmer_id  uuid not null references public.farmer_profiles (profile_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_suppliers_unique unique (buyer_id, farmer_id)
);
create index saved_suppliers_farmer_id_idx on public.saved_suppliers (farmer_id);

create table public.verification_submissions (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  farm_id        uuid references public.farms (id) on delete cascade,
  type           public.verification_submission_type not null,
  document_paths text[] not null default '{}' check (cardinality(document_paths) <= 10),
  notes          text check (notes is null or char_length(notes) <= 2000),
  status         public.submission_status not null default 'PENDING',
  reviewer_id    uuid references public.profiles (id) on delete set null,
  review_notes   text check (review_notes is null or char_length(review_notes) <= 2000),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint verification_submissions_farm_required check ((type = 'FARM') = (farm_id is not null))
);
create index verification_submissions_profile_idx on public.verification_submissions (profile_id);
create index verification_submissions_farm_idx on public.verification_submissions (farm_id);
create index verification_submissions_status_idx on public.verification_submissions (status, created_at);
create index verification_submissions_reviewer_idx on public.verification_submissions (reviewer_id);
create unique index verification_submissions_one_pending
  on public.verification_submissions (profile_id, type, coalesce(farm_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'PENDING';

create table public.disputes (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  opened_by   uuid not null references public.profiles (id) on delete restrict,
  reason      text not null check (char_length(btrim(reason)) between 1 and 2000),
  status      public.dispute_status not null default 'OPEN',
  resolution  text check (resolution is null or char_length(resolution) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index disputes_order_id_idx on public.disputes (order_id);
create index disputes_opened_by_idx on public.disputes (opened_by);
create index disputes_resolved_by_idx on public.disputes (resolved_by);
create index disputes_status_idx on public.disputes (status, created_at);
create unique index disputes_one_open_per_order
  on public.disputes (order_id) where status in ('OPEN', 'UNDER_REVIEW');

-- ---------------------------------------------------------------------------
-- updated_at triggers on every table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'farmer_profiles', 'buyer_profiles', 'farms', 'crop_categories',
    'listings', 'listing_images', 'offers', 'buying_requests', 'request_offers',
    'orders', 'order_items', 'order_status_history', 'reviews', 'notifications',
    'saved_suppliers', 'verification_submissions', 'disputes'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;
