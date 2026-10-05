# CROPO REMEDIATION — PASS 0
## Read-Only Audit & Implementation Plan

**Date:** 2026-10-04  
**Scope:** Full repository audit vs `CROPO_BUILD_PLAN.md`, `CROPO_HANDOFF.md`, and `cropo_full_audit.md`  
**Status:** Read-only inspection complete. Awaiting user authorization before implementation.

---

## 1. Sign-Out Server Action Runtime Error Investigation

### Location & Stack Trace
- **File:** `src/components/shared/sign-out-button.tsx` (lines 7–16)
- **Component:** `SignOutButton`
- **Invoked Server Action:** `signOut()` in `src/actions/auth.ts` (lines 80–100)
- **Middleware / Proxy:** `updateSession()` in `src/lib/supabase/proxy.ts` (lines 22–88) via `src/proxy.ts` (lines 5–7)
- **Container Hierarchy:** `DashboardShell` (`src/components/dashboard/dashboard-shell.tsx:29`) $\rightarrow$ `DashboardLayout` (`src/app/dashboard/layout.tsx:11`)

### Current Behavior & Root Cause Analysis
1. **Partial Header Bypass:** Commit `3e2ff546` introduced `if (request.headers.has("next-action")) return NextResponse.next();` in `src/lib/supabase/proxy.ts`. This handles client-side React Flight requests that include the `Next-Action` header. However:
   - When submitted via native HTML form submit (e.g. before React hydration completes, or on progressive enhancement fallback), the browser issues a standard `POST` with `Content-Type: multipart/form-data` and a form field `$ACTION_ID_<hash>`.
   - In that scenario, `request.headers.has("next-action")` evaluates to `false`.
   - The proxy falls through to `createServerClient`. When Supabase's auth cookies are cleared during session update, `setAll` calls `response = NextResponse.next({ request })`.
   - Re-instantiating `NextResponse.next({ request })` inside middleware on an incoming POST request clones the request headers but breaks/drops the underlying multipart request body stream.
   - Next.js Server Action runtime receives a terminated or corrupted stream and raises:
     `Error: An unexpected response was received from the server.`
2. **Stale Turbopack Dev Process:** Terminal metadata shows `npm run dev` has been running for 22+ hours. Next.js 16 (Turbopack) does not always hot-reload `proxy.ts`/`middleware.ts` without a clean dev server restart.
3. **Missing Client Pending State:** `SignOutButton` is currently a Server Component rendering a plain `<form action={signOut}>`. It lacks pending UX, debouncing against double clicks, or graceful client-side fallback.

### Expected Behavior
Sign-out must work reliably across both client Flight actions and native multipart form submissions without corrupting the POST stream, clear all auth cookies, and redirect cleanly to `/login`.

### Database Tables / RLS / Migrations Involved
None (purely auth session / proxy / component architecture).

### Proposed Minimal Fix
1. In `src/lib/supabase/proxy.ts`: Detect Server Actions broadly by checking both `request.headers.has("next-action")` AND `(request.method === "POST" && request.headers.get("content-type")?.includes("multipart/form-data"))`, returning `NextResponse.next()` immediately to preserve the request body stream untouched for the action handler.
2. In `src/components/shared/sign-out-button.tsx`: Mark `"use client"`, use React 19's `useActionState` or `useTransition` to display pending state and disable multiple clicks during execution.
3. Restart the Next.js dev server process.

- **Risk Level:** Low

---

## 2. High Severity Issues (H1 — H5)

### H1 — Live Test Data in Public Marketplace
- **Exact File:** `src/lib/data/marketplace.ts` (lines 100–242), `scripts/verify-foundation.ts`, `scripts/verify-phase4.ts`, `scripts/verify-phase5.ts`, `scripts/verify-signout.ts`
- **Exact Function / Component:** `getMarketplaceListings()`, test suite execution routines
- **Current Behavior:** Anonymous visitors querying the live marketplace receive 7 active listings, 5 of which are synthetic test records ("Test Cassava", "Yellow Maize Batch A"). Public farmer views expose ~24 test accounts ("Repro Farmer 0..9", "Test SignOut Farmer", "Kwame Farmer"). Verification test scripts create live accounts and listings in the primary database without teardown.
- **Expected Behavior:** Per `CROPO_BUILD_PLAN.md` §11 and `CROPO_HANDOFF.md` §13: No fake or synthetic data may appear in public production views. An empty marketplace must render an honest empty state ("No active produce listings at the moment"). Test scripts must clean up their records or run against a dedicated staging/test environment.
- **Database Tables Involved:** `public.listings`, `public.listing_images`, `public.profiles`, `public.farmer_profiles`, `public.buyer_profiles`, `public.farms`, `public.orders`, `public.order_items`, `auth.users`
- **RLS Policies Involved:** `listings_select_active_public`, `public_farmer_profiles` view
- **Migrations Involved:** None (data hygiene issue)
- **Dependencies:** Requires careful handling of `orders.buyer_id` / `orders.farmer_id` (`ON DELETE RESTRICT`)
- **Proposed Minimal Fix:**
  1. Authorize an administrative cleanup script (using service role key out-of-band) to remove test orders, test listings, test storage artifacts, and test users in strict dependency order.
  2. Add an automated teardown / cleanup hook to all `scripts/verify-*.ts` files so subsequent test runs never pollute the live database.
- **Tests Required:** Verification script ensuring zero synthetic accounts/listings match known test email domains (`@cropo.test`, `@example.com`).
- **Risk Level:** High (Destructive action; requires explicit user approval)

---

### H2 — Stock Consumed with No Restoration Mechanism
- **Exact File:** `supabase/migrations/20261004000700_buyer_phase5.sql` (lines 147–151, 262–266)
- **Exact Function / Component / RPC:** `public.create_buy_now_order()` and `public.accept_offer_and_create_order()`
- **Current Behavior:** Both RPCs immediately decrement `listings.quantity_available` upon order placement. If an order transitions to `CANCELLED` or `REJECTED`, or expires, no database trigger or RPC replenishes the listing stock. Furthermore, there are zero Server Actions in the repository to transition orders out of `PENDING` (Buy Now orders remain stuck in `PENDING` permanently with lost inventory).
- **Expected Behavior:** When an order created from a listing is `CANCELLED` or `REJECTED`, stock must be returned to `listings.quantity_available`, and if previously marked `SOLD_OUT`, the status must be restored to `ACTIVE`. Order transition functions must enforce state machine invariants.
- **Database Tables Involved:** `public.listings`, `public.orders`, `public.order_items`
- **RLS Policies Involved:** N/A (enforced via database trigger / SECURITY DEFINER functions)
- **Migrations Involved:** Requires a new migration (e.g. `20261004000800_order_stock_restoration.sql`)
- **Dependencies:** Order status state machine defined in `supabase/migrations/20261004000300_auth_and_guards.sql`
- **Proposed Minimal Fix:**
  1. Add a PostgreSQL trigger `trg_order_status_stock_restore` on `public.orders` after update of `status`: if `new.status in ('CANCELLED', 'REJECTED')` and `old.status not in ('CANCELLED', 'REJECTED')`, restore `order_items.quantity` back to `listings.quantity_available` and reset `listings.status` from `SOLD_OUT` to `ACTIVE` where applicable.
  2. Implement transition actions for orders (Phase 6 transaction engine).
- **Tests Required:** Create Buy Now order, assert stock drops; cancel/reject order, assert stock restores and listing returns to `ACTIVE`.
- **Risk Level:** High (Financial and inventory integrity)

---

### H3 — RLS Column Grants & Update Policies Allow Quote Tampering
- **Exact File:** `supabase/migrations/20261004000400_rls.sql` (lines 68–70), `supabase/migrations/20261004000700_buyer_phase5.sql` (lines 5–35)
- **Exact Function / Component / RPC:** Policies `request_offers_update_buyer`, `request_offers_update_own_pending`, `offers_update_farmer`, and column grants on `public.request_offers`
- **Current Behavior:**
  1. Migration `...400_rls.sql` granted `update (quantity, price_per_unit, available_date, message, status)` on `request_offers` to `authenticated`.
  2. Policy `request_offers_update_buyer` checks `with check (status in ('ACCEPTED', 'REJECTED'))`. Because the column grant includes `price_per_unit` and `quantity`, a buyer can submit a direct PostgREST `PATCH` modifying `price_per_unit` while setting `status = 'ACCEPTED'`.
  3. Furthermore, marking `status = 'ACCEPTED'` via direct table update bypasses the atomic RPC `accept_request_offer_and_create_order`, leaving an accepted quote with no backing order.
  4. Policy `offers_update_farmer` allows a farmer to set `status = 'ACCEPTED'` directly on `public.offers`, bypassing `accept_offer_and_create_order`.
- **Expected Behavior:** Commercial terms (`quantity`, `price_per_unit`) must be immutable once created. Acceptance transitions must happen strictly through atomic `SECURITY DEFINER` RPCs that create the order and lock inventory simultaneously. Direct table updates should only be permitted for cancellation/withdrawal (`WITHDRAWN`) or rejection (`REJECTED`).
- **Database Tables Involved:** `public.request_offers`, `public.offers`
- **RLS Policies Involved:** `request_offers_update_buyer`, `request_offers_update_own_pending`, `offers_update_farmer`
- **Migrations Involved:** Requires a new migration (e.g. `20261004000900_tighten_quote_rls.sql`)
- **Dependencies:** `src/actions/buyer.ts`, `src/actions/farmer.ts`
- **Proposed Minimal Fix:**
  1. Revoke `update (quantity, price_per_unit)` on `public.request_offers` from `authenticated`.
  2. Drop `request_offers_update_buyer` and re-create it to only allow setting `status = 'REJECTED'` (`with check (status = 'REJECTED')`). Acceptance must be executed exclusively via RPC.
  3. Re-create `offers_update_farmer` to only allow setting `status = 'REJECTED'`. Acceptance must go exclusively via `accept_offer_and_create_order`.
- **Tests Required:** Authenticated cross-user IDOR test attempting to PATCH price/quantity or set status to `ACCEPTED` directly via Supabase client, asserting HTTP 403 / RLS denial.
- **Risk Level:** High (Financial integrity / quote fraud)

---

### H4 — `accept_request_offer_and_create_order` Under-Validation
- **Exact File:** `supabase/migrations/20261004000700_buyer_phase5.sql` (lines 277–386)
- **Exact Function / Component / RPC:** `public.accept_request_offer_and_create_order()`
- **Current Behavior:**
  1. Does not check `buying_requests.status = 'OPEN'`. If the request was previously cancelled or fulfilled, quotes can still be accepted.
  2. Sibling quotes submitted by other farmers remain `PENDING`. They are not rejected, allowing concurrent acceptance or leaving farmers unaware the request closed.
  3. If `v_ro.listing_id` is linked to the quote, the RPC creates an `order_items` record referencing `listing_id` but **never locks the listing, never validates available stock, and never decrements stock**, enabling severe overselling.
- **Expected Behavior:**
  1. Must assert `v_request.status = 'OPEN'`.
  2. Must reject all other pending sibling quotes for that request (`update request_offers set status = 'REJECTED' where request_id = v_request.id and id <> p_request_offer_id and status = 'PENDING'`).
  3. If `v_ro.listing_id` is not null, it must lock the listing `FOR UPDATE`, verify `quantity_available >= v_ro.quantity`, decrement `quantity_available`, and update listing status if depleted.
- **Database Tables Involved:** `public.request_offers`, `public.buying_requests`, `public.listings`, `public.orders`, `public.order_items`
- **RLS Policies Involved:** N/A (RPC is `SECURITY DEFINER`)
- **Migrations Involved:** Requires migration updating `accept_request_offer_and_create_order`
- **Dependencies:** `src/actions/buyer.ts` (line 264)
- **Proposed Minimal Fix:** Replace `public.accept_request_offer_and_create_order` with the validated logic including request status check, sibling quote rejection, and listing stock lock/decrement.
- **Tests Required:** Test accepting an offer on a closed request (must fail); test sibling offers are rejected; test stock deduction on listing-backed quotes.
- **Risk Level:** High (Data consistency / overselling)

---

### H5 — Email Confirmation & SITE_URL Configuration
- **Exact File:** `src/lib/env.ts` (line 15), `src/actions/auth.ts` (lines 24–44)
- **Exact Function / Component:** `getPublicEnv()`, `signUp()`
- **Current Behavior:**
  1. In `src/lib/env.ts`, `NEXT_PUBLIC_SITE_URL` has a default of `"http://localhost:3000"`. If deployed without setting this variable, confirmation emails generated by Supabase Auth direct users to `localhost:3000`.
  2. In the live project, `supabase.auth.signUp()` immediately returns an active session (`if (data.session) redirect("/dashboard")`), indicating email confirmation is currently disabled in the live Supabase Auth dashboard settings.
- **Expected Behavior:** Production deployments must require a valid, non-localhost `NEXT_PUBLIC_SITE_URL`. The application must clearly reflect whether email confirmation is strictly enforced or bypassed for local development.
- **Database Tables Involved:** `auth.users`, `public.profiles`
- **RLS Policies Involved:** None
- **Migrations Involved:** None
- **Dependencies:** Deployment environment variables (.env.production / Vercel project settings)
- **Proposed Minimal Fix:**
  1. In `src/lib/env.ts`: Remove the default `"http://localhost:3000"` when `NODE_ENV === "production"`, forcing a build/startup error if `NEXT_PUBLIC_SITE_URL` is omitted.
  2. User decision needed: determine whether Supabase dashboard "Enable email confirmations" should be toggled on for production.
- **Tests Required:** Environment validation test in production mode.
- **Risk Level:** High (Account security / auth flow)

---

## 3. Medium Severity Issues (M1 — M13)

### M1 — Listing Quantity Lost Update
- **Exact File:** `src/actions/farmer.ts` (lines 191–210)
- **Exact Function / Component:** `updateListing()`
- **Current Behavior:** The farmer edit form reads `quantity_available` from `FormData` and overwrites `listings.quantity_available = data.quantity_available`. If a buyer placed an order that decremented stock by 30 units while the farmer was editing the listing description, saving the form restores the pre-order quantity, causing accidental overselling.
- **Expected Behavior:** Listing edits must not blindly overwrite stock. The update must calculate the delta or use an atomic conditional update/RPC (e.g. `quantity_available = quantity_available + (new_qty - form_initial_qty)`), or explicitly check that current database stock matches the baseline when the form opened.
- **Database Tables Involved:** `public.listings`
- **RLS Policies Involved:** `listings_update_own`
- **Migrations Involved:** None (or minimal RPC if atomic delta adjustment is preferred)
- **Dependencies:** `src/components/farmer/listing-form.tsx`
- **Proposed Minimal Fix:** Include the initial loaded quantity as a hidden field in the form. In `updateListing`, compute delta = `new_quantity - initial_quantity`, and update `quantity_available = quantity_available + delta`, asserting `quantity_available + delta >= 0`.
- **Tests Required:** Simulate concurrent order decrement followed by form submission; assert order decrement is preserved.
- **Risk Level:** Medium

---

### M2 — Verification Workflow Incomplete
- **Exact File:** `src/app/dashboard/farmer/verification/page.tsx` (lines 21–119)
- **Exact Function / Component:** `FarmerVerificationPage`
- **Current Behavior:** The verification page is purely static/informational. It claims documents are "strictly encrypted and stored in private Supabase Storage buckets", but there is no document upload form, no Server Action inserting into `public.verification_submissions`, and no way for a farmer to submit verification. Trigger `guard_farmer_profile_verification()` in `20261004000300_auth_and_guards.sql` (lines 106–115) blocks farmers from setting `verification_status = 'PENDING'`. Thus, the `PENDING` verification state is unreachable.
- **Expected Behavior:** Per `CROPO_BUILD_PLAN.md` Phase 4: A farmer should be able to upload identification/land documents to the private `verification-documents` bucket and submit a record to `public.verification_submissions`. A trigger or action transitions `farmer_profiles.verification_status` to `PENDING`.
- **Database Tables / Buckets Involved:** `public.verification_submissions`, `public.farmer_profiles`, Storage bucket `verification-documents`
- **RLS Policies Involved:** `verification_submissions_insert_farmer`, `verification_submissions_select`
- **Migrations Involved:** Trigger update or function to allow setting `PENDING` upon valid submission.
- **Dependencies:** `src/actions/farmer.ts`
- **Proposed Minimal Fix:**
  1. Create Server Action `submitVerification(formData)` in `src/actions/farmer.ts` uploading to `verification-documents/{farmerId}/{filename}` and inserting a row into `verification_submissions`.
  2. Add DB trigger on `verification_submissions` insert to update `farmer_profiles.verification_status = 'PENDING'`.
  3. Add an interactive submission form in `src/app/dashboard/farmer/verification/page.tsx`.
- **Tests Required:** Test upload of verification document, record creation, and status change to `PENDING`.
- **Risk Level:** Medium

---

### M3 — Delete Listing Missing & Dead Status Code
- **Exact File:** `src/components/farmer/listing-status-toggle.tsx` (lines 18–22), `supabase/migrations/20261004000400_rls.sql` (lines 168–171)
- **Exact Function / Component:** `ListingStatusToggle`, policy `listings_update_own`
- **Current Behavior:**
  1. `ListingStatusToggle` contains a branch `if (newStatus === "REMOVED")`, but renders no button to trigger it.
  2. If `newStatus === "REMOVED"` were passed, PostgreSQL RLS rejects it because `listings_update_own` specifies `with check (status <> 'REMOVED')`.
  3. A hard SQL `DELETE` fails for any listing with past offers due to `offers.listing_id ON DELETE RESTRICT`.
- **Expected Behavior:** Per `CROPO_BUILD_PLAN.md` Phase 4: Farmers must be able to remove/delete their listings cleanly (soft-delete via `REMOVED` status or safe hard-delete if no references exist).
- **Database Tables Involved:** `public.listings`, `public.offers`, `public.order_items`
- **RLS Policies Involved:** `listings_update_own`, `listings_delete_own_unordered`
- **Migrations Involved:** Migration updating `listings_update_own` to permit setting `status = 'REMOVED'`.
- **Dependencies:** `src/actions/farmer.ts` (lines 264–297), `src/components/farmer/listing-status-toggle.tsx`
- **Proposed Minimal Fix:**
  1. In a new migration, alter `listings_update_own` to allow transitions to `status = 'REMOVED'`.
  2. Expose a "Remove / Delete" button in `ListingStatusToggle` and the listing edit view.
- **Tests Required:** Farmer transitions listing to `REMOVED`; verify listing disappears from public marketplace and moves to "Removed" tab in dashboard.
- **Risk Level:** Medium

---

### M4 — Missing Marketplace Filters (Quantity & Verified Farmer)
- **Exact File:** `src/components/marketplace/marketplace-filters.tsx` (lines 83–166), `src/lib/data/marketplace.ts` (lines 124–142)
- **Exact Function / Component:** `MarketplaceFilters`, `getMarketplaceListings()`
- **Current Behavior:** The filter bar supports `q`, `category`, `region`, `grade`, and `delivery`. It does not support filtering by minimum available quantity or by verified farmers, both of which are specified in `CROPO_BUILD_PLAN.md` Phase 3.
- **Expected Behavior:** Users can filter listings by minimum available volume/quantity and toggle `verified_only` to filter by farmers with `verification_status = 'VERIFIED'`.
- **Database Tables Involved:** `public.listings`, `public.farmer_profiles`
- **RLS Policies Involved:** `listings_select_active_public`
- **Migrations Involved:** None
- **Dependencies:** `src/components/marketplace/marketplace-filters.tsx`, `src/lib/data/marketplace.ts`
- **Proposed Minimal Fix:** Add `minQuantity` input and `verifiedOnly` checkbox to `MarketplaceFilters`, passing them to `getMarketplaceListings()` to filter via SQL `.gte("quantity_available", minQuantity)` and joining on `farmer_profiles.verification_status`.
- **Tests Required:** Query marketplace with `minQuantity=50` and `verifiedOnly=true`; assert non-matching listings are excluded.
- **Risk Level:** Low

---

### M5 — Unsupported Claims & Dead Admin Navigation
- **Exact File:** `src/app/dashboard/admin/page.tsx` (lines 14–35), `src/config/navigation.ts` (lines 48–55), `src/actions/buyer.ts` (line 226), `src/lib/data/marketplace.ts` (lines 368–369)
- **Exact Function / Component:** `AdminDashboardPage`, `dashboardNav.ADMIN`, `createBuyingRequest()`, `getFarmerProfileById()`
- **Current Behavior:**
  1. Admin dashboard renders static hard-coded `"0"` for all metrics (even though 7 listings exist).
  2. Admin navigation lists 6 sub-routes (`/dashboard/admin/farmers`, `buyers`, `listings`, `orders`, `disputes`, `analytics`), all of which return 404.
  3. `createBuyingRequest` returns `"Buying request published. Verified farmers will be notified."` when no notification mechanism exists.
  4. Marketplace farmer profile provides fallback labels `"Commercial Farm"` or `"Registered Farm Holding"` when the farmer has registered no farms.
- **Expected Behavior:** Per `CROPO_BUILD_PLAN.md` §11: "Never invent... No fake statistics... No unsupported UI claims." Real counts or honest "Pending Phase 7" states must be displayed. Dead links must not be rendered. Accurate success messages must be used.
- **Database Tables Involved:** None
- **RLS Policies Involved:** None
- **Migrations Involved:** None
- **Dependencies:** Admin dashboard components, buyer action feedback
- **Proposed Minimal Fix:**
  1. In `src/actions/buyer.ts`: Update message to `"Buying request published to the marketplace."`
  2. In `src/lib/data/marketplace.ts`: Show `"Individual Farmer (No registered holding)"` if no farm row exists.
  3. In `src/config/navigation.ts`: Restrict `dashboardNav.ADMIN` to Overview until Phase 7 is implemented.
  4. In `src/app/dashboard/admin/page.tsx`: Query real counts or display "Phase 7 — Under Construction".
- **Tests Required:** Verify admin nav contains no 404 links; check buyer request toast wording.
- **Risk Level:** Low

---

### M6 — Buy Now Ignores `delivery_available`
- **Exact File:** `supabase/migrations/20261004000700_buyer_phase5.sql` (lines 74–76), `src/actions/buyer.ts` (lines 123–147)
- **Exact Function / Component / RPC:** `public.create_buy_now_order()`
- **Current Behavior:** The RPC verifies `if p_delivery_method = 'DELIVERY' and (p_delivery_address is null or ...)`, but never checks `v_listing.delivery_available`. A buyer can select `DELIVERY` on a listing that the farmer marked as pickup-only (`delivery_available = false`).
- **Expected Behavior:** The RPC must reject delivery orders if the produce listing does not offer delivery:
  `if p_delivery_method = 'DELIVERY' and not v_listing.delivery_available then raise exception 'Delivery is not available for this listing' using errcode = '23514';`
- **Database Tables Involved:** `public.listings`, `public.orders`
- **RLS Policies Involved:** None
- **Migrations Involved:** Migration updating `create_buy_now_order`
- **Dependencies:** `src/actions/buyer.ts`, `src/components/buyer/buy-now-dialog.tsx`
- **Proposed Minimal Fix:** Add the check to `create_buy_now_order()` and validate client-side in `buyNowSchema`.
- **Tests Required:** Attempt Buy Now with `DELIVERY` on a pickup-only listing; assert transaction raises error.
- **Risk Level:** Medium

---

### M7 — Silent Failure Patterns
- **Exact File:** `src/actions/farmer.ts` (lines 99–126), `src/actions/buyer.ts` (lines 98–111, 297–309, 393–404), `src/lib/data/farmer.ts` (lines 504–514)
- **Exact Function / Component:** `createListing()`, `withdrawOffer()`, `rejectFarmerRequestOffer()`, `toggleSavedSupplier()`, `getFarmerOffers()`
- **Current Behavior:**
  1. `createListing`: Files with invalid MIME or >5MB are silently skipped with `continue`. The `listing_images.insert` result is unawaited/ignored; failed inserts leave orphaned storage files while reporting success.
  2. `withdrawOffer` & `rejectFarmerRequestOffer`: Supabase update queries don't check row counts; if 0 rows matched (e.g. quote was already accepted or ID was invalid), the action still returns `success("Offer successfully withdrawn")`.
  3. `toggleSavedSupplier`: `insert()` and `delete()` queries ignore errors completely.
  4. Data-layer queries (`getFarmerOffers`, etc.) return `[]` on query error, causing database failures to disguise as empty states.
- **Expected Behavior:** Upload rejections must inform the user. Mutations must assert that at least 1 row was modified. Data layer failures should throw or log structured errors rather than disguising outages as empty collections.
- **Database Tables Involved:** `public.listing_images`, `public.offers`, `public.request_offers`, `public.saved_suppliers`
- **RLS Policies Involved:** N/A
- **Migrations Involved:** None
- **Dependencies:** Server action return types and error utilities
- **Proposed Minimal Fix:** Add error checks to all Supabase mutation queries and validate that updated row count is $>0$ (`.select()` with length check). Return explicit error feedback when files are skipped.
- **Tests Required:** Test submitting mismatched file type; test mutating non-existent offer ID; assert failure response.
- **Risk Level:** Medium

---

### M8 — Raw RPC Error Messages Returned to Client
- **Exact File:** `src/actions/buyer.ts` (lines 153, 275), `src/actions/farmer.ts` (line 495)
- **Exact Function / Component:** `createBuyNowOrder()`, `acceptFarmerRequestOffer()`, `acceptOffer()`
- **Current Behavior:** Actions use `return failure(error?.message || "Failed...")`. When an RPC exception occurs, raw internal PostgreSQL error strings (including PLpgSQL variable names and SQL state codes) are passed directly to the browser.
- **Expected Behavior:** Server Actions should sanitize database errors into user-friendly messages using `src/lib/utils/errors.ts` while logging the full raw details securely on the server.
- **Database Tables Involved:** None
- **RLS Policies Involved:** None
- **Migrations Involved:** None
- **Dependencies:** `src/lib/utils/errors.ts`
- **Proposed Minimal Fix:** Map PostgreSQL error codes/messages via a helper `toUserErrorMessage(error)` in `src/lib/utils/errors.ts`.
- **Tests Required:** Trigger RPC constraint violation; verify response contains sanitized human-readable error text.
- **Risk Level:** Low

---

### M9 — Unsafe Type Casts (`as any` / `as unknown as`)
- **Exact File:** `src/actions/farmer.ts` (lines 58, 177, 278, 308, 369, 435), `src/lib/data/marketplace.ts` (lines 154, 167, 280), `src/lib/data/farmer.ts` (lines 145, 176, 215, 251, 368, 453, 626, 726), `src/lib/data/buyer.ts` (lines 333, 358, 475)
- **Exact Function / Component:** Farmer listing/farm actions and data retrieval functions
- **Current Behavior:** 6 instances of `const db = supabase as any;` in `farmer.ts` with `eslint-disable` annotations. 22 instances of `as unknown as DbRow` throughout the data layer. This defeats TypeScript strict mode and obscures schema drift.
- **Expected Behavior:** Queries should leverage generated database types from `src/types/database.types.ts` without bypassing type safety.
- **Database Tables Involved:** All
- **RLS Policies Involved:** None
- **Migrations Involved:** None
- **Dependencies:** `src/types/database.types.ts`
- **Proposed Minimal Fix:** Provide properly typed table schemas for joined queries using `Tables<"listings">` or explicit QueryData types from `@supabase/supabase-js`.
- **Tests Required:** Run `npx tsc --noEmit` and `npm run lint`.
- **Risk Level:** Low

---

### M10 — Performance, Pagination & In-Memory Search
- **Exact File:** `src/lib/data/marketplace.ts` (lines 121–127, 218–237, 373–374)
- **Exact Function / Component:** `getMarketplaceListings()`, `getFarmerProfileById()`
- **Current Behavior:**
  1. `getMarketplaceListings` queries all active listings without pagination (`limit`/`range`). Text search filters in Node.js memory (`.includes()`), bypassing the `listings.search` `tsvector` column and GIN index.
  2. `filters.region` uses `.ilike("region", filters.region)` without escaping SQL `%` and `_` characters.
  3. `getFarmerProfileById` loads every active listing in the entire database via `getMarketplaceListings()` and filters by `l.farmer.id === farmerId` in memory.
- **Expected Behavior:** Listings must be paginated. Text search should use PostgreSQL full-text search (`.textSearch("search", query)`). Region filter should escape wildcards or use exact matches. Farmer listings should be queried with `.eq("farmer_id", farmerId)`.
- **Database Tables Involved:** `public.listings`
- **RLS Policies Involved:** `listings_select_active_public`
- **Migrations Involved:** None
- **Dependencies:** `src/lib/data/marketplace.ts`
- **Proposed Minimal Fix:** Refactor `getMarketplaceListings` to accept `page`/`pageSize`, use `.textSearch("search", formattedQuery)` when `q` is present, and query farmer-specific listings directly by `farmer_id`.
- **Tests Required:** Test text search with special characters; verify database pagination query parameters.
- **Risk Level:** Medium

---

### M11 — Design System Inconsistencies & Modal Accessibility
- **Exact File:** `src/components/shared/site-header.tsx` (line 18), `src/components/marketplace/listing-card.tsx` (lines 26–30), `src/app/page.tsx` (line 100), `src/components/buyer/buy-now-dialog.tsx` (line 89), `src/components/buyer/make-offer-dialog.tsx` (line 81), `src/components/farmer/farmer-quote-dialog.tsx` (line 51)
- **Exact Function / Component:** `SiteHeader`, `ListingCard`, `LandingPage`, `BuyNowDialog`, `MakeOfferDialog`, `FarmerQuoteDialog`
- **Current Behavior:**
  1. Hand-rolled dialogs (`buy-now-dialog`, `make-offer-dialog`, `farmer-quote-dialog`) render plain `div` tags with `backdrop-blur-xs`, `animate-in zoom-in-95`. They lack `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trapping, and `Escape` key listeners.
  2. Design guidelines in `CROPO_BUILD_PLAN.md` §12 explicitly rule out: glassmorphism, decorative gradients, and spinning animated icons. Yet `backdrop-blur` is used in 6 components, `bg-gradient-to-t` is in the landing hero, and ~20 components use `Loader2 animate-spin`.
- **Expected Behavior:** Modals must be accessible (using Radix UI Dialog primitives already installed via shadcn/ui or proper ARIA attributes, focus trap, and Escape handling). CSS classes should adhere to the approved restrained aesthetic.
- **Database Tables Involved:** None
- **RLS Policies Involved:** None
- **Migrations Involved:** None
- **Dependencies:** Radix Dialog or custom accessible wrapper
- **Proposed Minimal Fix:** Replace custom modal divs with accessible dialog primitives; remove `backdrop-blur` in favor of solid/clean backgrounds; replace `Loader2 animate-spin` with restrained button loading text or static progress indicators.
- **Tests Required:** Keyboard navigation test (Tab cycle trapped, Escape closes modal).
- **Risk Level:** Low

---

### M12 — SEO Infrastructure Missing
- **Exact File:** `src/app/layout.tsx` (lines 13–19), `src/app/page.tsx` (line 93), `src/app/robots.ts`, `src/app/sitemap.ts`
- **Exact Function / Component:** Root layout metadata, public asset structure
- **Current Behavior:**
  1. No `src/app/robots.ts` or `src/app/sitemap.ts`.
  2. Root metadata lacks `metadataBase`, `openGraph`, `twitter`, and favicon declarations.
  3. The only landing image is a hot-linked Unsplash URL.
  4. `public/images/placeholder-crop.jpg` is an incomplete 134-byte stub.
- **Expected Behavior:** Complete SEO setup with dynamic sitemap for marketplace produce, robots.txt disallowing `/dashboard/`, proper Open Graph social cards, local optimized assets, and complete metadata.
- **Database Tables Involved:** None
- **RLS Policies Involved:** None
- **Migrations Involved:** None
- **Dependencies:** Next.js Metadata API
- **Proposed Minimal Fix:** Add `src/app/robots.ts`, `src/app/sitemap.ts`, populate `openGraph` in `layout.tsx`, replace the 134-byte placeholder with a clean asset, and replace the external Unsplash URL with a local optimized image.
- **Tests Required:** Validate `robots.txt` and `sitemap.xml` endpoints return valid HTTP 200 responses.
- **Risk Level:** Low

---

### M13 — Notifications Architecture Inactive
- **Exact File:** `supabase/migrations/20261004000200_tables.sql` (lines 311–326), `src/components/dashboard/dashboard-shell.tsx`
- **Exact Function / Component:** Notification table schema & dashboard headers
- **Current Behavior:** `public.notifications` table and `public.notification_type` enum exist in the database, but no application code or database trigger writes to them. Neither the farmer nor buyer dashboard contains a notification bell or feed.
- **Expected Behavior:** In-app notifications should be generated when offers are received, accepted, or rejected, and when order status updates occur.
- **Database Tables Involved:** `public.notifications`
- **RLS Policies Involved:** `notifications_select_own`, `notifications_update_own`
- **Migrations Involved:** Database triggers to insert notifications on order/offer lifecycle events (Phase 6 scope).
- **Dependencies:** Order & Offer state machines
- **Proposed Minimal Fix:** Retain as formal Phase 6 scope. In the interim, ensure no UI components make misleading claims regarding automated notifications.
- **Tests Required:** Notification insertion test when order is placed/updated.
- **Risk Level:** Low

---

## 4. Audit Items Unverifiable from Current Repository

The following findings from the audit cannot be verified solely from the local codebase:

1. **Live Supabase Auth Dashboard Settings for Email Confirmation (H5):**
   Whether "Enable email confirmations" is enabled or disabled in the Supabase Cloud dashboard is an administrative project setting not tracked in Git. It was inferred from the behavior of `signUp()` returning an active session immediately, but cannot be inspected directly from repository files.
2. **Current Live Database Row Counts (H1):**
   The exact count of active test listings (previously 5) and public profiles (previously ~24) in the live cloud Supabase database cannot be re-queried during Pass 0 without violating the strict "Do NOT touch the live database / read-only" constraint.
3. **Live Exploitability of Direct PostgREST PATCH (H3):**
   Static code analysis confirms that `grant update (quantity, price_per_unit)` and policy `request_offers_update_buyer` permit authenticated buyers to patch prices. However, executing an actual malicious PATCH request against the live database was intentionally omitted to avoid modifying live records.
4. **Browser Runtime Reproduction of Sign-Out Error:**
   Headless browser testing tools (Playwright) failed to launch in this environment due to local driver installation constraints. Reproduction has been analyzed through HTTP request simulation and source analysis rather than direct browser rendering.
5. **Supabase Database Linter & Security Advisor Output:**
   Security Advisor flags (e.g. regarding `security_definer` views vs `security_invoker`) reside in the Supabase management console and cannot be verified locally without CLI credentials.

---

## 5. Remediation Implementation Plan

### 5.1 Recommended Implementation Order

The remediation should be executed in 4 distinct passes:

- **Pass 1 — Auth & Test Data Hygiene (Immediate):**
  Fix the sign-out Server Action runtime error, enforce `NEXT_PUBLIC_SITE_URL` validation, align email confirmation settings, and perform administrative cleanup of live test accounts/listings.
- **Pass 2 — Database Integrity, Inventory & RLS (Critical Backend):**
  Deploy new migrations to fix RLS quote vulnerabilities (H3), harden the request-offer RPC (H4), implement inventory replenishment on order cancellation/rejection (H2), and enforce delivery availability checks on Buy Now (M6).
- **Pass 3 — Farmer Experience & Error Sanitization (Core Features):**
  Implement the farmer verification submission flow (M2), implement listing deletion/removal (M3), prevent quantity lost updates (M1), sanitize RPC errors (M8), and remove misleading UI claims / dead links (M5).
- **Pass 4 — Search, Accessibility, Types & SEO (Polish & Performance):**
  Add Quantity and Verified filters (M4), refactor marketplace search to use PostgreSQL full-text search with pagination (M10), replace unsafe `any` casts (M9), fix modal accessibility and design-rule breaches (M11), and add robots/sitemap/metadata (M12).

---

### 5.2 Files Likely to Change in Each Pass

#### Pass 1:
- `src/lib/supabase/proxy.ts` (Fix stream drop on multipart Server Actions)
- `src/components/shared/sign-out-button.tsx` (Client pending state)
- `src/lib/env.ts` (Enforce production siteUrl)
- `scripts/verify-foundation.ts`, `scripts/verify-phase4.ts`, `scripts/verify-phase5.ts`, `scripts/verify-signout.ts` (Add teardown routines)

#### Pass 2:
- `supabase/migrations/20261004000800_remediation_security.sql` (New migration file)
- `src/actions/buyer.ts`
- `src/actions/farmer.ts`

#### Pass 3:
- `src/actions/farmer.ts` (Add verification submission, delete listing, quantity delta)
- `src/app/dashboard/farmer/verification/page.tsx` (Add document upload form)
- `src/components/farmer/listing-status-toggle.tsx` (Enable remove action)
- `src/components/farmer/listing-form.tsx`
- `src/app/dashboard/admin/page.tsx` (Remove fake 0s)
- `src/config/navigation.ts` (Prune 404 admin links)
- `src/lib/utils/errors.ts` (RPC error mapping)

#### Pass 4:
- `src/components/marketplace/marketplace-filters.tsx`
- `src/lib/data/marketplace.ts`
- `src/lib/data/farmer.ts`
- `src/lib/data/buyer.ts`
- `src/components/buyer/buy-now-dialog.tsx`
- `src/components/buyer/make-offer-dialog.tsx`
- `src/components/farmer/farmer-quote-dialog.tsx`
- `src/components/shared/site-header.tsx`
- `src/app/page.tsx`
- `src/app/robots.ts`, `src/app/sitemap.ts`
- `src/app/layout.tsx`

---

### 5.3 Database Migrations Required

All changes will be packaged in a single new additive migration:  
`supabase/migrations/20261004000800_remediation_security.sql`

This migration will contain:
1. Revocation of column grants on `public.request_offers` for `quantity` and `price_per_unit`.
2. Replacement of `request_offers_update_buyer` and `offers_update_farmer` policies.
3. Update to `listings_update_own` policy to permit `status = 'REMOVED'`.
4. Replacement of RPC `public.create_buy_now_order` (adding `delivery_available` validation).
5. Replacement of RPC `public.accept_request_offer_and_create_order` (adding request OPEN check, sibling quote rejection, and listing inventory locking/deduction).
6. Trigger on `public.orders` to automatically return `order_items.quantity` back to `listings.quantity_available` upon transition to `CANCELLED` or `REJECTED`.
7. Trigger on `public.verification_submissions` to transition `farmer_profiles.verification_status` to `PENDING`.

---

### 5.4 RLS Policies Requiring Changes

| Policy Name | Table | Change Required | Rationale |
|---|---|---|---|
| `request_offers_update_buyer` | `public.request_offers` | Replace `with check` from `('ACCEPTED', 'REJECTED')` to strictly `('REJECTED')` | Prevent direct PostgREST acceptance without order creation (H3) |
| `offers_update_farmer` | `public.offers` | Replace `with check` from `('ACCEPTED', 'REJECTED')` to strictly `('REJECTED')` | Prevent direct PostgREST acceptance without atomic order RPC (H3) |
| `request_offers_update_own_pending` | `public.request_offers` | Limit updatable columns via grant revocation | Prevent farmers altering quote price after submission (H3) |
| `listings_update_own` | `public.listings` | Change `with check (status <> 'REMOVED')` to allow `status in ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'REMOVED')` | Enable listing deletion/soft-removal (M3) |

---

### 5.5 RPCs Requiring Changes

1. **`public.create_buy_now_order(uuid, numeric, delivery_method, text, text)`:**
   - Add verification that `v_listing.delivery_available = true` when `p_delivery_method = 'DELIVERY'` (M6).
2. **`public.accept_request_offer_and_create_order(uuid)`:**
   - Check `v_request.status = 'OPEN'`.
   - Reject sibling pending quotes for the same `request_id`.
   - Lock, validate, and decrement `listings.quantity_available` when `v_ro.listing_id` is present (H4).
3. **`public.restore_order_stock()` (New Trigger Function):**
   - Execute on `public.orders` update to `CANCELLED` or `REJECTED` to replenish listing inventory (H2).

---

### 5.6 Tests That Must Be Added

1. **Sign-Out Reliability Test:** Test sign out via client Flight header AND native multipart form submission; assert cookies cleared and 303 redirect returned without stream error.
2. **Authenticated Cross-User IDOR Security Suite:**
   - Attempt to PATCH price or set `status = 'ACCEPTED'` on `request_offers` directly via buyer token (assert failure).
   - Attempt to set `status = 'ACCEPTED'` on `offers` directly via farmer token (assert failure).
3. **Inventory Replenishment Test:** Place Buy Now order (assert stock decrements); transition order to `CANCELLED` (assert stock restored and status set back to `ACTIVE`).
4. **Request-Offer Concurrency & Validation Test:** Accept quote on fulfilled request (assert failure); accept quote and assert sibling quotes are marked `REJECTED`; accept quote with listing reference and assert listing stock is decremented.
5. **Delivery Validation Test:** Submit Buy Now order with `DELIVERY` on a pickup-only listing (assert failure).
6. **Lost Update Test:** Verify that updating listing details preserves concurrent quantity decrements.
7. **Accessibility & Keyboard Navigation Test:** Verify dialogs trap focus and close on `Escape`.

---

### 5.7 Destructive Actions Requiring User Approval

Before any destructive actions are executed, explicit user approval is required for:

1. **Purging Test Data from the Live Supabase Project:**
   Deleting the ~24 synthetic farmer/buyer profiles, 5 test listings, associated order records, and auth users created during previous test runs. Because orders use `ON DELETE RESTRICT`, this involves cascading deletion of test orders, order items, status histories, offers, and auth records.
2. **Modifying Table Grants & RLS Policies on Live Database:**
   Revoking column-level `UPDATE` grants on `public.request_offers` and altering existing RLS policies on the live database.
3. **Applying Database Migration `20261004000800_remediation_security.sql`:**
   Deploying the new migration to the live Supabase project via `supabase db push` or Supabase SQL Editor.
4. **Dev Server Process Restart:**
   Terminating and restarting the running `npm run dev` background process to apply middleware/proxy changes.
