# CROPO REMEDIATION REPORT — PASS 5
**Scope:** Listing Removal (M3) and Stock Update Integrity (M1)  
**Date:** 2026-10-05  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Remediation Pass 5 resolves issues **M1** (Lost Update on produce stock edits) and **M3** (Delete Listing via authorized soft removal).

All changes have been enforced at the PostgreSQL database / RPC / RLS level, wired to Next.js Server Actions and interactive UI components, verified against test suites, and validated for complete type-safety and clean production builds.

---

## 2. Issue Resolution Details

### M3 — Delete Listing (Secure Soft Remove)

- **Soft Remove Only:** Listings are never hard-deleted. Historical order line items (`order_items.listing_id`) and status audits remain fully linked and intact.
- **Authorization & Access Boundaries:**
  - Implemented `public.remove_farmer_listing(p_listing_id uuid)` RPC (`SECURITY DEFINER`).
  - Strict ownership check: callers can remove only their own listings unless they hold an administrative role (`public.is_admin()`).
  - Direct client updates attempting to transition `status = 'REMOVED'` via PostgREST bypass are denied by PostgreSQL RLS (`with check (status <> 'REMOVED')`).
- **Marketplace Visibility:**
  - Public marketplace policy `listings_select_active_public` requires `status = 'ACTIVE'`.
  - Removed listings immediately disappear from anonymous and buyer marketplace listings and search results.
- **Offer Safety:**
  - Upon soft removal, all pending offers on the listing (`public.offers`) are automatically transitioned to `status = 'EXPIRED'`, preventing dangling quotes from being accepted on discontinued produce.
- **UI & Server Action Integration:**
  - Exported `removeListing(listingId: string)` Server Action in `src/actions/farmer.ts`.
  - Updated `updateListingStatus` to route `newStatus === 'REMOVED'` to `remove_farmer_listing`.
  - Activated the dead `REMOVED` branch in `ListingStatusToggle` (`src/components/farmer/listing-status-toggle.tsx`) with a confirmation dialog and red Destructive styling.

### M1 — Lost Update (Optimistic Concurrency Control)

- **Root Cause Addressed:**
  - A farmer opening a listing form with quantity 100 could inadvertently overwrite a concurrent purchase that reduced stock to 60 if their browser submitted the stale quantity 100.
- **Database-Enforced Optimistic Concurrency:**
  - Added `version integer not null default 1` to `public.listings`.
  - Created `bump_listing_version()` trigger on `public.listings` (`BEFORE UPDATE`) that automatically increments `version := version + 1` and updates `updated_at := now()`.
  - Implemented `public.update_farmer_listing(...)` RPC:
    - Row-locks target listing (`SELECT ... FOR UPDATE`).
    - Validates caller ownership.
    - Validates that the listing is not `REMOVED`.
    - Compares `p_expected_version` against `v_listing.version`. If mismatched, raises error `P0001` (*"Listing has been modified by another transaction..."*).
- **Client & Server Wiring:**
  - Updated `listingSchema` in `src/lib/validation/farmer.ts` to coerce and accept `expected_version`.
  - Extended `FarmerListingItem` and queries (`getFarmerListingById`, `getFarmerListings`) in `src/lib/data/farmer.ts` to return `version`.
  - Added hidden `expected_version` field to `ListingForm` (`src/components/farmer/listing-form.tsx`).
  - In `updateListing` Server Action (`src/actions/farmer.ts`), routed mutations through `update_farmer_listing` and transformed concurrency conflict errors into clear user feedback: *"This listing was updated by another transaction (such as a concurrent purchase). Please reload before saving."*

---

## 3. Test Suites & Verification Results

All required verification suites were executed:

1. **TypeScript Typecheck:**
   - Command: `npx tsc --noEmit`
   - Result: **0 errors**
2. **ESLint:**
   - Command: `npm run lint`
   - Result: **0 errors, 0 warnings**
3. **Next.js Production Build:**
   - Command: `npm run build`
   - Result: **Compiled successfully; all 25 static & dynamic routes generated**
4. **Phase 3 Verification Suite:**
   - Command: `npx tsx scripts/verify-phase3.ts`
   - Result: **37 passed, 0 failed**
5. **Phase 4 Farmer Verification Suite:**
   - Command: `npx tsx scripts/verify-phase4.ts`
   - Result: **28 passed, 0 failed**
6. **Phase 5 Buyer & Order Verification Suite:**
   - Command: `npx tsx scripts/verify-phase5.ts`
   - Result: **29 passed, 0 failed**
7. **Pass 3 Buy Now & Stock Test Suite:**
   - Command: `npx tsx scripts/verify-pass3-stock.ts`
   - Result: **25 passed, 0 failed**
8. **Pass 5 Listing Removal & Stock Integrity Suite:**
   - Command: `npx tsx scripts/verify-pass5-listing-integrity.ts`
   - Result: **26 passed, 0 failed**
   - Verified Scenarios:
     - Initial stock = 100, version = 1.
     - Concurrent Buy Now transaction reduces stock to 60, version bumps to 2.
     - Stale farmer update attempting to restore stock to 100 using stale version 1 is rejected by database/RPC.
     - Stock preserved at 60 (lost update prevented).
     - Legitimate update with current version 2 successfully updates stock to 75, version increments to 3.
     - Direct client mutation to `status = 'REMOVED'` blocked by RLS check.
     - Unauthorized farmers blocked from removing another farmer's listing.
     - Farmer soft removal succeeds and listing disappears from public marketplace.
     - Pending offers on removed listing safely transition to `EXPIRED`.
     - Order history and order items linked to removed listing remain intact.

---

## 4. File Manifest

### Database Migrations Applied
- `supabase/migrations/20261004001200_listing_removal_and_stock_integrity.sql`
- `supabase/migrations/20261004001300_update_farmer_listing_return_json.sql`
- `supabase/migrations/20261004001400_fix_concurrency_error_code.sql`

### Application Code
- `src/actions/farmer.ts` (RPC integration for optimistic update and soft removal; error handling)
- `src/lib/validation/farmer.ts` (added `expected_version` validation)
- `src/lib/data/farmer.ts` (added `version` to listing queries and interfaces)
- `src/components/farmer/listing-form.tsx` (propagated hidden `expected_version` input)
- `src/components/farmer/listing-status-toggle.tsx` (enabled functional soft removal with confirmation)
- `src/types/database.types.ts` (updated database schema definitions)

### Tests & Documentation
- `scripts/verify-pass5-listing-integrity.ts` (26 automated regression tests for M1 & M3)
- `CROPO_HANDOFF.md` (updated project handoff with Pass 5 completion)
- `REMEDIATION_REPORT_PASS_5.md` (this report)
