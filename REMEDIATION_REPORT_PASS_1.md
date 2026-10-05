# Cropo Remediation — Pass 1 Completion Report
## Secure Offers & Request Offers (H3 & H4)

**Date:** 2026-10-05  
**Scope:** Pass 1 Remediation — Focus exclusively on H3 (Offer & Quote Authorization) and H4 (Request Offer Atomic RPC Hardening)  
**Status:** Complete, Applied, Verified, and Committed  
**Git Commit:** `f2b45c79f9d1cfda81b5b5eab925794ccbaee848`  
**Commit Message:** `fix: harden offer authorization and request offer transactions`

---

## 1. Executive Summary

In Pass 1 of the remediation program, the database-level security and transaction logic for produce offers and request quotes were hardened to address audit findings **H3** and **H4**:

1. **Authorization Hardening (H3):** Revoked excessive column grants on `public.request_offers` and updated Row Level Security (RLS) policies on both `public.offers` and `public.request_offers`. Direct client updates can no longer set `status = 'ACCEPTED'`, forcing all acceptances through atomic `SECURITY DEFINER` RPCs that create backed orders and manage stock. Commercial terms (`quantity`, `price_per_unit`) are strictly immutable once submitted.
2. **Transaction & Inventory Hardening (H4):** Re-engineered `public.accept_request_offer_and_create_order()` to enforce that the buying request remains `OPEN`, automatically reject competing pending quotes upon quote acceptance, and atomically validate and decrement listing inventory when a quote references a marketplace produce listing.
3. **Automated Cross-User Verification:** Built and executed an end-to-end security test suite (`scripts/verify-pass1-security.ts`) with 30 assertions verifying multi-tenant isolation, tamper resistance, and state machine consistency. Zero regressions occurred across the existing test suites.

---

## 2. Root Cause Analysis

### A. H3 — Offer & Request-Offer Authorization Weaknesses
- **Permissive Column Grants:** Migration `20261004000400_rls.sql` granted `UPDATE (quantity, price_per_unit, available_date, message, status)` on `public.request_offers` to the `authenticated` role.
- **Quote Repricing & Tampering:** In `20261004000700_buyer_phase5.sql`, the buyer policy `request_offers_update_buyer` used `with check (status in ('ACCEPTED', 'REJECTED'))`. Because the column grant included `price_per_unit` and `quantity`, an authenticated buyer could issue a PostgREST `PATCH` modifying the price and quantity of a farmer's quote during acceptance.
- **Bypassing Order Creation:** Both `request_offers_update_buyer` and `offers_update_farmer` permitted setting `status = 'ACCEPTED'` via direct client update queries, allowing records to be marked "accepted" without executing the required RPC functions. This could leave accepted quotes and offers with **no order record, no audit log, and no stock deduction**.
- **Stale Farmer Repricing:** Farmer policy `request_offers_update_own_pending` allowed `with check (status in ('PENDING', 'WITHDRAWN'))`, allowing farmers to reprice quotes after submission.

### B. H4 — Request Offer RPC Validation & Stock Vulnerabilities
- **Lack of Request State Validation:** The previous `accept_request_offer_and_create_order()` RPC locked `buying_requests` but failed to verify `status = 'OPEN'`. If a buyer cancelled or closed a request, pending quotes could still be accepted.
- **Dangling Competing Quotes:** Sibling quotes submitted by other farmers for the same buying request remained `PENDING` indefinitely after one was accepted, creating ambiguity and allowing potential double acceptance.
- **Overselling on Listing-Linked Quotes:** When a farmer's quote referenced an existing `listing_id`, the RPC inserted an order item but never acquired a row lock on `public.listings`, never checked `quantity_available >= quantity`, and never decremented stock.

---

## 3. SQL & RLS Changes

All changes were implemented via database migration:  
**`supabase/migrations/20261004000800_harden_offers_and_request_offers.sql`**  
*(Applied to the live Supabase project via `supabase db push`)*.

### 1. Tightened Column Grants on `public.request_offers`
```sql
revoke update on public.request_offers from authenticated;
grant update (status, responded_at) on public.request_offers to authenticated;
```
- No user can update `quantity`, `price_per_unit`, `available_date`, `message`, `listing_id`, `farmer_id`, or `request_id`.
- Any PostgREST `PATCH` attempting to modify commercial terms fails immediately at the PostgreSQL grant layer.

### 2. Restrict Direct RLS Update Policies (Force Acceptance Through RPCs)

#### A. Direct Offers (`public.offers`)
```sql
drop policy if exists offers_update_farmer on public.offers;
create policy offers_update_farmer on public.offers
  for update to authenticated
  using (farmer_id = (select auth.uid()) and status = 'PENDING')
  with check (farmer_id = (select auth.uid()) and status = 'REJECTED');
```
- Farmers can directly decline (`REJECTED`) an offer via Server Action `rejectOffer`.
- Direct client updates to `status = 'ACCEPTED'` are rejected by RLS.
- Acceptance must be executed exclusively via `accept_offer_and_create_order()`.

#### B. Request Offers — Farmer Withdrawal (`public.request_offers`)
```sql
drop policy if exists request_offers_update_own_pending on public.request_offers;
create policy request_offers_update_own_pending on public.request_offers
  for update to authenticated
  using (farmer_id = (select auth.uid()) and status = 'PENDING')
  with check (farmer_id = (select auth.uid()) and status = 'WITHDRAWN');
```
- Farmers can only withdraw (`status = 'WITHDRAWN'`) their own pending quote.
- Farmers cannot reprice quotes while `PENDING`.
- Once accepted, quotes can no longer be withdrawn by the farmer.

#### C. Request Offers — Buyer Decline (`public.request_offers`)
```sql
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
```
- Buyers can directly decline (`REJECTED`) quotes via `rejectFarmerRequestOffer`.
- Direct client updates to `status = 'ACCEPTED'` are rejected by RLS.
- Acceptance must be executed exclusively via `accept_request_offer_and_create_order()`.

---

## 4. RPC Hardening

### 1. `public.accept_request_offer_and_create_order(p_request_offer_id uuid)`
- **Caller Role Verification:** Confirms caller identity from `auth.uid()` and validates that `profiles.role = 'BUYER'`.
- **Row Locking:** Locks `request_offers` and `buying_requests` rows using `FOR UPDATE`.
- **Request State Check (H4.1):** Enforces `if v_request.status <> 'OPEN' then raise exception 'Buying request is no longer open...'`.
- **Listing Stock Validation & Atomic Decrement (H4.2):** If `v_ro.listing_id is not null`:
  - Locks the listing row `FOR UPDATE`.
  - Asserts `v_listing.status = 'ACTIVE'`.
  - Asserts `v_listing.quantity_available >= v_ro.quantity`.
  - Atomically decrements `quantity_available = quantity_available - v_ro.quantity`.
  - Automatically transitions listing status to `'SOLD_OUT'` if inventory reaches zero.
- **Competing Quote Resolution (H4.3):** Atomically transitions all sibling quotes for that request:
  ```sql
  update public.request_offers
  set status = 'REJECTED',
      responded_at = now(),
      updated_at = now()
  where request_id = v_request.id
    and id <> v_ro.id
    and status = 'PENDING';
  ```
- **Order Creation:** Generates exactly one order with `source = 'REQUEST'`, `status = 'ACCEPTED'`, and creates the corresponding itemized `order_items` record.

### 2. `public.accept_offer_and_create_order(p_offer_id uuid)`
- Added listing status validation `if v_listing.status <> 'ACTIVE' then raise exception 'Produce listing is no longer active...'` to prevent accepting offers against paused or removed listings.

---

## 5. Verification & Test Results

A dedicated cross-user security test suite was authored at `scripts/verify-pass1-security.ts`, creating authentic buyer and farmer test identities and validating all 10 security scenarios (A through J).

### Pass 1 Security Test Suite Results

| Test ID | Requirement Description | Expected Result | Actual Result |
|:---:|---|---|:---:|
| **A** | Buyer cannot modify farmer quote price | Column update fails; price unchanged | **PASSED** |
| **B** | Buyer cannot modify farmer quote quantity | Column update fails; quantity unchanged | **PASSED** |
| **C** | Farmer cannot illegally modify accepted quote | Update on accepted quote blocked by RLS | **PASSED** |
| **D** | Buyer cannot directly mark quote ACCEPTED | RLS `with check` rejects direct accept | **PASSED** |
| **E** | Farmer cannot directly mark offer ACCEPTED | RLS `with check` rejects direct accept | **PASSED** |
| **F** | Request quote cannot be accepted twice | RPC rejects second acceptance attempt | **PASSED** |
| **G** | Closed/cancelled request cannot accept quote | RPC rejects acceptance on cancelled RFQ | **PASSED** |
| **H** | Competing quotes receive correct final statuses | Winner $\rightarrow$ `ACCEPTED`, Competing $\rightarrow$ `REJECTED`, RFQ $\rightarrow$ `FULFILLED` | **PASSED** |
| **I** | Listing stock cannot be oversold & decrements atomically | Overselling blocked; valid quote decrements stock | **PASSED** |
| **J** | User A cannot access User B's offers / request offers | Cross-user query returns 0 rows; cross-mutation blocked | **PASSED** |

**Summary: 30 / 30 security assertions passed.**  
*Automated teardown routine wiped all orders, requests, and listings created during the test run.*

---

## 6. Full Regression Suite Status

| Test Suite | File | Result |
|---|---|:---:|
| **Pass 1 Security Suite** | `scripts/verify-pass1-security.ts` | **30 / 30 PASSED** |
| **Phase 5 Verification Suite** | `scripts/verify-phase5.ts` | **29 / 29 PASSED** |
| **Farmer Offers Regression Suite** | `scripts/verify-farmer-offers-regression.ts` | **18 / 18 PASSED** |
| **Phase 4 Verification Suite** | `scripts/verify-phase4.ts` | **28 / 28 PASSED** |
| **Phase 3 Verification Suite** | `scripts/verify-phase3.ts` | **37 / 37 PASSED** |
| **Phase 2 Foundation Suite** | `scripts/verify-foundation.ts` | **22 / 22 PASSED** |
| **TypeScript Strict Check** | `npx tsc --noEmit` | **0 ERRORS** |
| **ESLint Validation** | `npm run lint` | **0 ERRORS, 0 WARNINGS** |
| **Next.js Production Build** | `npm run build` | **25 / 25 ROUTES COMPILED** |

---

## 7. Artifacts & Deliverables

1. **Migration File:**
   - `supabase/migrations/20261004000800_harden_offers_and_request_offers.sql`
2. **Security Test Suite:**
   - `scripts/verify-pass1-security.ts`
3. **Database Types:**
   - `src/types/database.types.ts`
4. **Git Commit:**
   - Hash: `f2b45c79f9d1cfda81b5b5eab925794ccbaee848`
   - Message: `fix: harden offer authorization and request offer transactions`
