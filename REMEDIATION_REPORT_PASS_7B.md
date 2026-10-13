# CROPO — REMEDIATION REPORT PASS 7B: PUBLIC PAGE CACHING AND RENDERING PERFORMANCE

**Date:** 2026-10-13  
**Status:** Completed & Fully Verified  
**Commit:** `caa0386173bd07d812428b1f9b292af23e3e278c` (`perf: cache public marketplace pages`)  

---

## 1. Executive Summary

Pass 7B targeted Cropo's public page response times across the five key public routes (`/`, `/about`, `/how-it-works`, `/marketplace`, and `/marketplace/[id]`) by introducing safe, carefully scoped caching and rendering configurations.

### Key Outcomes:
- **Static Content Promoted to Pre-Rendered (`force-static`):** `/about` and `/how-it-works` now render statically at build time, reducing production HTTP response times from over 1,000 ms to **~20 ms** with zero database round-trips.
- **Incremental Static Regeneration for Homepage (`/`):** Configured with `revalidate = 60` and backed by `unstable_cache` with tag `featured-listings`. Homepage response times dropped from 1,162 ms in Pass 7A to **407 ms** in production (a **65.0% reduction**).
- **Listing-Detail Data Caching with On-Demand Revalidation (`/marketplace/[id]`):** Produce catalog data is cached via `unstable_cache` with a 30-second background revalidation window and tag `listing-${id}`. Authentication checks (`getCurrentProfile`) continue running dynamically at request time to keep sessions secure. Server actions immediately invalidate tags upon listing edits, removals, or purchases.
- **Search, Filter & Pagination Dynamics Strictly Preserved (`/marketplace`):** The catalog page remains dynamically evaluated per request (`force-dynamic`), ensuring every combination of `q`, `category`, `region`, `grade`, `delivery`, `verified`, `minPrice`, `maxPrice`, and `page` executes against the PostgreSQL database without risk of cache collision or cross-query poisoning.
- **Transactional Authority Intact:** Order-creation RPCs (`create_buy_now_order`, `accept_offer_and_create_order`) continue executing PostgreSQL row locking (`SELECT ... FOR UPDATE`) in the database. Public-page caching never authorizes transactions or bypasses live inventory checks.

---

## 2. Rendering & Caching Strategy by Route

| Route | Rendering Mode | Revalidation Strategy | Rationale & Cache Invalidation |
|---|---|---|---|
| **`/about`** | Static (`force-static`) | Build-time prerender (`initialRevalidateSeconds = false`) | Purely informational page with no request-specific dependencies or user cookies. Response served in 20 ms. |
| **`/how-it-works`** | Static (`force-static`) | Build-time prerender (`initialRevalidateSeconds = false`) | Static operational documentation with no dynamic cookies or database dependencies. Response served in 22 ms. |
| **`/` (Homepage)** | ISR (`revalidate = 60`) | 60-second time-based ISR + On-demand tag invalidation | Prerendered at build time. Data query `getFeaturedListings` is cached with tags `featured-listings` and `marketplace-listings`. Purged on listing creation, update, or purchase. |
| **`/marketplace`** | Dynamic (`force-dynamic`) | Request-time evaluation (`revalidate = 0`) | Search parameters (`searchParams`) drive full-text search, filtering, and pagination. Remaining dynamic prevents cross-query cache collisions and satisfies Requirement 6. |
| **`/marketplace/[id]`** | Dynamic Auto (Shell) + Cached Data Layer | 30-second revalidation + On-demand tag `listing-${id}` | The route shell evaluates dynamically per request to populate the user's session role for `BuyNowDialog` and `MakeOfferDialog`. Produce data is fetched via `unstable_cache` (30s) and deduplicated per-request via `React.cache()`. |

---

## 3. Files Changed and Reasons

### 1. `src/app/about/page.tsx`
- **Change:** Added `export const dynamic = "force-static";`.
- **Reason:** Promotes the route to static prerendering, serving static HTML without evaluating at request time.

### 2. `src/app/how-it-works/page.tsx`
- **Change:** Added `export const dynamic = "force-static";`.
- **Reason:** Promotes the workflow guide to static prerendering, serving static HTML without server evaluation.

### 3. `src/app/page.tsx`
- **Change:** Replaced `dynamic = "force-dynamic"` and `revalidate = 0` with `export const revalidate = 60;`.
- **Reason:** Enables Incremental Static Regeneration (ISR) with a 60-second revalidation interval and 1-year expiration window, serving pre-rendered HTML while regenerating in the background.

### 4. `src/app/marketplace/[id]/page.tsx`
- **Change:** Removed `dynamic = "force-dynamic"` and `revalidate = 0`, replacing with `export const revalidate = 30;`.
- **Reason:** Allows the route's data queries to leverage `unstable_cache` with a 30-second revalidation window while preserving per-request dynamic execution for session/auth checks.

### 5. `src/lib/data/marketplace.ts`
- **Change:**
  - Wrapped `getFeaturedListings` with `unstable_cache` (60s revalidation, tags: `["featured-listings", "marketplace-listings"]`).
  - Wrapped `getMarketplaceListingById` with `unstable_cache` (30s revalidation, tags: `["marketplace-listings", "listing-" + id]`), while preserving `React.cache()` for intra-request deduplication between `generateMetadata` and the page component.
  - Implemented safe fallback so that if `incrementalCache` is missing (such as in standalone test scripts outside Next.js runtime), the direct database fetch runs without throwing an invariant error.
- **Reason:** Improves data access speeds across requests while maintaining complete compatibility with external test runners and Next.js 16 caching semantics.

### 6. `src/actions/farmer.ts`
- **Change:** Added `revalidateTag` from `next/cache` to `createListing`, `updateListing`, `removeListing`, `updateListingStatus`, `deleteListingImage`, and `acceptOffer`.
- **Reason:** Ensures that whenever a farmer modifies price, volume, status, or photos, the cached listing and homepage are immediately purged (`revalidateTag("listing-" + listingId, "max")` and `revalidatePath("/")`).

### 7. `src/actions/buyer.ts`
- **Change:** Added `revalidateTag` from `next/cache` to `createBuyNowOrder`.
- **Reason:** Ensures that when a purchase takes place, the listing tag (`listing-${listingId}`), featured listings tag, and homepage are immediately marked stale so other buyers do not see outdated stock.

### 8. `scripts/verify-pass7b-caching.ts`
- **Change:** Created comprehensive automated verification suite covering route segment configurations, build manifest guarantees, query parameter preservation, listing detail freshness, database transaction authority, and cache invalidation wiring.
- **Reason:** Provides regression protection for all Pass 7B caching and rendering requirements.

### 9. `scripts/measure-benchmarks.ts`
- **Change:** Expanded benchmarking suite to measure all 5 public routes against the production build server.
- **Reason:** Captures objective before-and-after response time and payload measurements.

---

## 4. Cache Invalidation and Freshness Guarantees

1. **Tag-Based Targeted Invalidation:**
   - Each listing detail query registers tag `listing-${id}` and general tag `marketplace-listings`.
   - The homepage query registers tag `featured-listings` and `marketplace-listings`.
2. **Immediate Eviction on Mutation:**
   - **Farmer updates listing price or volume:** `revalidateTag("listing-" + listingId, "max")`, `revalidatePath("/marketplace/" + listingId)`, and `revalidatePath("/")` are triggered.
   - **Farmer pauses, archives, or removes listing:** Listing status is updated in the database; `remove_farmer_listing` RPC sets status to `REMOVED`; tags and paths are purged immediately. Subsequent requests resolve to `null` and return `notFound()`.
   - **Buyer places Buy Now order:** `createBuyNowOrder` triggers `revalidateTag("listing-" + listingId, "max")`, `revalidateTag("featured-listings", "max")`, and `revalidatePath("/")`.
   - **Farmer accepts offer:** `acceptOffer` triggers tag and path revalidation for both the listing and the catalog.
3. **Stale Listing Safety:**
   - Background revalidation intervals (60s for homepage, 30s for listing detail) set an upper bound on cache lifetime.
   - Server Actions provide immediate on-demand invalidation.

---

## 5. Security & Correctness Considerations

- **RLS Authorization Preserved:** Supabase Row Level Security remains strictly enforced on all tables. Anonymous clients can only access `listings` with `status = 'ACTIVE'` and `public_farmer_profiles`.
- **Private Data Isolation:** Private buyer and farmer profile fields (phone numbers, full addresses, internal notes, verification documents) are never queried or stored in the public page cache.
- **Dashboards Remain Uncached Publicly:** Dashboard routes (`/dashboard/farmer`, `/dashboard/buyer`, `/dashboard/admin`) remain fully protected behind authentication middleware and session authorization.
- **Transactional Authority (Row Locking):**
  - Public-page caching **never** authorizes or commits transactions.
  - The PostgreSQL stored procedure `create_buy_now_order` performs `SELECT ... FROM listings WHERE id = p_listing_id FOR UPDATE`.
  - It validates live status (`ACTIVE`), available quantity (`quantity_available >= p_quantity`), valid buyer role, delivery capability, and self-purchase rules in the database transaction.
  - If a listing is out of stock or removed, the transaction aborts with an error regardless of what any cached client page displays.

---

## 6. Before vs. After Benchmark Measurements

Measurements captured using `scripts/measure-benchmarks.ts` against the live PostgreSQL database and production Next.js server (`next start` on port 3000):

| Route / Metric | Baseline (Audit) | Pass 7A | Pass 7B | Total Improvement |
|---|---|---|---|---|
| **About Page (`/about`)** | ~1,200 ms (dynamic) | ~1,200 ms (dynamic) | **20 ms (static)** | **98.3% faster** |
| **How It Works (`/how-it-works`)** | ~1,100 ms (dynamic) | ~1,100 ms (dynamic) | **22 ms (static)** | **98.0% faster** |
| **Homepage (`/`) HTTP Response** | 2,146 ms (dynamic) | 1,162 ms (data-opt) | **407 ms (ISR 60s)** | **81.0% faster** |
| **Homepage Payload Size** | 165.2 KB | 114.5 KB | **91.2 KB** | **44.8% reduction** |
| **Marketplace (`/marketplace`) HTTP** | 4,615 ms (full scan) | 2,116 ms (paginated) | **792 ms (production)** | **82.8% faster** |
| **Marketplace Payload Size** | 339.8 KB | 116.4 KB | **104.0 KB** | **69.4% reduction** |
| **Listing Detail (`/marketplace/[id]`)** | ~1,850 ms (full query) | ~1,200 ms | **518 ms (cached)** | **72.0% faster** |
| **Listing Detail Payload Size** | 82.5 KB | 48.0 KB | **38.3 KB** | **53.6% reduction** |
| **`getFeaturedListings(4)` Query** | 2,146 ms (full catalog) | 592 ms (targeted) | **385 ms** | **82.1% faster** |

---

## 7. Verification, Lint, Typecheck & Build Results

### Automated Test Suites:
1. **Pass 7B Caching Suite (`scripts/verify-pass7b-caching.ts`):** **45/45 passed (0 failed)**
   - Static rendering verified for `/about` and `/how-it-works`
   - 60s ISR verified for `/`
   - Dynamic preservation verified for `/marketplace`
   - 30s auto revalidation verified for `/marketplace/[id]`
   - Build manifest initialRevalidateSeconds matches expectations
   - Query parameters, search keywords, and pagination do not collide
   - Transaction authority verified (anonymous calls blocked; authenticated row locks enforce stock)
   - Cache invalidation wiring verified across farmer and buyer actions
2. **Pass 7A Performance Suite (`scripts/verify-pass7a-performance.ts`):** **44/44 passed (0 failed)**
3. **Pass 7 Filter Completeness Suite (`scripts/verify-pass7-marketplace-filters.ts`):** **44/44 passed (0 failed)**
4. **Pass 1 Security Suite (`scripts/verify-pass1-security.ts`):** **30/30 passed (0 failed)**
5. **Pass 3 Stock & Delivery Suite (`scripts/verify-pass3-stock.ts`):** **25/25 passed (0 failed)**
6. **Pass 5 Listing Integrity Suite (`scripts/verify-pass5-listing-integrity.ts`):** **26/26 passed (0 failed)**
7. **Pass 6 Error Handling Suite (`scripts/verify-pass6-error-handling.ts`):** **35/35 passed (0 failed)**

### Static Analysis & Build:
- **`npx tsc --noEmit`**: **Passed (0 errors)**
- **`npm run lint`**: **Passed (0 errors)**
- **`npm run build`**: **Passed (0 errors)**. Prerender table:
  ```
  Route (app)                               Revalidate  Expire
  ┌ ○ /                                             1m      1y
  ├ ○ /_not-found
  ├ ○ /about
  ...
  ├ ○ /how-it-works
  ├ ○ /login
  ├ ƒ /marketplace
  ├ ƒ /marketplace/[id]
  └ ○ /signup
  ```

---

## 8. Remaining Performance Bottlenecks & Recommended Next Pass

1. **Dashboard Query Parallelization:** Buyer and farmer dashboards execute sequential queries that can be consolidated with `Promise.all` to reduce dashboard load times.
2. **Image CDN & Responsive Sizing:** Remote produce images lack AVIF/WebP srcset sizing and next-gen responsive loader optimization.
3. **Client Bundle Splitting:** Common UI modals (e.g. `BuyNowDialog`, `MakeOfferDialog`) can be dynamically imported to shave initial JavaScript bundle parse time on the listing detail page.
