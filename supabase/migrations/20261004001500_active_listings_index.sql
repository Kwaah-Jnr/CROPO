-- Cropo: Pass 7A - Active Listing Index for Marketplace Performance
-- Accelerates getMarketplaceListings and getFeaturedListings queries by providing
-- a pre-sorted partial index specifically on active produce listings.

create index if not exists listings_active_created_at_idx
on public.listings (created_at desc)
where status = 'ACTIVE';
