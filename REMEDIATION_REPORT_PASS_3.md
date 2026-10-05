# Cropo Remediation — Pass 3 Completion Report
## Buy Now and Stock Integrity (M6 & H2)

**Date:** 2026-10-05  
**Scope:** Pass 3 Remediation — Enforce Buy Now delivery validation (M6) and atomic stock integrity (H2)  
**Status:** Complete, Applied, Verified, and Committed  
**Git Commit:** `449d593ce4b959c02cbf274c6c516021ea663c20`  
**Commit Message:** `fix: enforce buy now delivery and stock validation`  

---

## 1. Executive Summary

In Pass 3 of the remediation program, the produce ordering system was hardened against delivery fraud and stock corruption in accordance with audit findings **M6** and **H2**:

1. **Immediate M6 Fix (Database & RPC Enforced):**
   `public.create_buy_now_order()` now strictly enforces that a listing marked as pickup-only (`delivery_available = false`) cannot accept orders with `delivery_method = 'DELIVERY'`. This check occurs inside the transaction after acquiring the row lock `FOR UPDATE` on `public.listings`. Any invalid delivery selection immediately aborts with SQL error code `23514` (`'Delivery is not available for this listing'`), ensuring **zero stock is consumed by invalid fulfillment requests**.
2. **H2 Stock Concurrency & Atomicity Guarding:**
   The transaction RPC acquires an exclusive row lock (`SELECT * FROM public.listings WHERE id = p_listing_id FOR UPDATE`), serializing concurrent purchase attempts. Concurrent requests competing for limited stock are evaluated sequentially against updated stock volumes. Overselling is strictly prevented: exactly one transaction succeeds while the subsequent competing transaction fails atomically (`'Requested quantity exceeds available volume'`), leaving remaining stock non-negative and accurate.
3. **Applied to Remote Database:**
   Migration `supabase/migrations/20261004000900_enforce_buy_now_delivery_and_stock.sql` was created and applied directly to the live Supabase project via `supabase db push`.
4. **Focused End-to-End Test Suite:**
   Built and executed `scripts/verify-pass3-stock.ts` (25/25 passed). All existing regression and security suites passed with zero regressions.

---

## 2. Root Cause Analysis & Findings Addressed

### A. M6 — Buy Now Ignores `delivery_available`
* **Defect:** Prior to Pass 3, `create_buy_now_order` checked destination address formatting for delivery orders (`if p_delivery_method = 'DELIVERY' and (p_delivery_address is null...)`), but **never validated the listing's `delivery_available` flag**.
* **Hazard:** A buyer could bypass client-side UI restrictions to submit a delivery order on a listing where the farmer only offers farm-gate pickup. The order was created, and stock was deducted.
* **Remediation:** Added database-level validation inside `create_buy_now_order`:
  ```sql
  if p_delivery_method = 'DELIVERY' and not v_listing.delivery_available then
    raise exception 'Delivery is not available for this listing' using errcode = '23514';
  end if;
  ```

### B. H2 — Stock Reservation & Invariant Integrity
* **Defect:** `create_buy_now_order` and `accept_offer_and_create_order` decrement listing stock immediately upon order placement. If an invalid order was initiated or if race conditions occurred, stock could be misallocated.
* **Remediation in Pass 3:** 
  * Validated that stock decrement only occurs within atomic `SECURITY DEFINER` transactions after all listing, farmer, role, and fulfillment invariants are verified.
  * Verified that row locking (`FOR UPDATE`) prevents double-allocation under concurrent load.
  * Verified that no direct client mutation can bypass the RPC (direct `INSERT`/`UPDATE` on `public.orders` and `public.order_items` remain strictly blocked by RLS).

---

## 3. Current Valid Order States & Transition Invariants

The Cropo database enforces an **11-state order lifecycle** backed by `public.guard_order_status()` and `public.order_transition_allowed()`:

```
[ PENDING ] ──(Buy Now Start)
   │
   ├──► [ ACCEPTED ] ──(Offer/Request Start)
   │       │
   │       ├──► [ CONFIRMED ]
   │       │       │
   │       │       └──► [ PREPARING ]
   │       │               │
   │       │               ├──► [ READY_FOR_PICKUP ] ──► [ IN_TRANSIT ] ──► [ DELIVERED ] ──► [ COMPLETED ]
   │       │               │                                                  │
   │       │               └──► [ IN_TRANSIT ] ───────────────────────────────┘
   │       │
   │       └──► [ CANCELLED ]
   │
   ├──► [ REJECTED ]
   └──► [ CANCELLED ]
```

### Order State Invariants:
1. **Initial States:**
   * `BUY_NOW` orders **must start in `PENDING`**.
   * `OFFER` and `REQUEST` orders **must start in `ACCEPTED`**.
   * Direct inserts attempting any other starting status are blocked with error `23514`.
2. **Allowed Transitions:**
   * `PENDING` $\rightarrow$ `ACCEPTED`, `REJECTED`, `CANCELLED`
   * `ACCEPTED` $\rightarrow$ `CONFIRMED`, `CANCELLED`
   * `CONFIRMED` $\rightarrow$ `PREPARING`, `CANCELLED`
   * `PREPARING` $\rightarrow$ `READY_FOR_PICKUP`, `IN_TRANSIT`, `DISPUTED`
   * `READY_FOR_PICKUP` $\rightarrow$ `IN_TRANSIT`, `DELIVERED`
   * `IN_TRANSIT` $\rightarrow$ `DELIVERED`, `DISPUTED`
   * `DELIVERED` $\rightarrow$ `COMPLETED`, `DISPUTED`
   * `DISPUTED` $\rightarrow$ `COMPLETED`, `CANCELLED`
3. **Terminal States:**
   * `COMPLETED`, `CANCELLED`, `REJECTED` have no outgoing transitions.
4. **Audit Trail:**
   * Every valid transition triggers `public.record_order_status()`, inserting an immutable row into `public.order_status_history`.

---

## 4. Exact Files Changed and Created

* **New Database Migration:**
  `supabase/migrations/20261004000900_enforce_buy_now_delivery_and_stock.sql`
  * Implemented M6 delivery validation in `public.create_buy_now_order`.
  * Applied to the live Supabase instance via `supabase db push`.
* **New Test Suite:**
  `scripts/verify-pass3-stock.ts`
  * End-to-end verification covering pickup-only rejection, pickup allowance, delivery allowance, over-order rejection, and race condition concurrency.

---

## 5. Test Verification Results

### Automated Quality Checks
* `npx tsc --noEmit`: **0 errors**
* `npm run lint`: **0 errors, 0 warnings**
* `npm run build`: **Compiled successfully, all 25 routes generated cleanly**

### Pass 3 Focused Verification Suite (`scripts/verify-pass3-stock.ts`)
| Test Case | Description | Result |
|---|---|---|
| **Pickup-only + delivery** | Pickup-only listing (`delivery_available: false`) with delivery order | **Rejected (`Delivery is not available for this listing`)** |
| **Pickup-only stock unconsumed** | Listing stock unchanged (20) after rejected delivery attempt | **Passed (Stock = 20)** |
| **Pickup listing + pickup order** | Pickup order on pickup listing | **Allowed (HTTP 200, status `PENDING`, `PICKUP`)** |
| **Pickup stock deduction** | Listing stock decremented accurately (20 - 5 = 15) | **Passed (Stock = 15, `ACTIVE`)** |
| **Delivery-enabled + delivery** | Delivery order on delivery-enabled listing (`delivery_available: true`) | **Allowed (status `PENDING`, `DELIVERY`)** |
| **Delivery stock deduction** | Listing stock decremented accurately (30 - 10 = 20) | **Passed (Stock = 20)** |
| **Insufficient stock** | Ordering 25 units when only 20 units available | **Rejected (`Requested quantity exceeds available volume`)** |
| **Stock preserved on over-order** | Stock remains 20 after rejected over-order attempt | **Passed (Stock = 20)** |
| **Concurrent stock race** | 2 buyers concurrently buying 8 units each on 10-unit listing | **Atomic: Exactly 1 succeeded, 1 rejected** |
| **No negative stock** | Final stock is exactly $10 - 8 = 2$ units | **Passed (Stock = 2, never negative)** |
| **Automated Teardown** | Cleaned up all test orders and listings created | **Passed** |
| **Total Pass 3 Results** | **25 passed, 0 failed** | **Clean** |

### All Regression Suites Passed Cleanly
* **Pass 1 Security Suite (H3 & H4)** (`scripts/verify-pass1-security.ts`): **30 passed, 0 failed**
* **Sign-Out Regression Suite** (`scripts/verify-signout.ts`): **20 passed, 0 failed**
* **Phase 2 Foundation Suite** (`scripts/verify-foundation.ts`): **22 passed, 0 failed**
* **Phase 3 Regression Suite** (`scripts/verify-phase3.ts`): **37 passed, 0 failed**
* **Phase 4 Regression Suite** (`scripts/verify-phase4.ts`): **28 passed, 0 failed**
* **Phase 5 Regression Suite** (`scripts/verify-phase5.ts`): **29 passed, 0 failed**
* **Farmer Offers Regression Suite** (`scripts/verify-farmer-offers-regression.ts`): **18 passed, 0 failed**

---

## 6. Git Commit

```
449d593ce4b959c02cbf274c6c516021ea663c20
fix: enforce buy now delivery and stock validation
```

---

## 7. Remaining Phase 6 Stock Lifecycle Work

Per instructions, the execution stopped prior to implementing full cancellation/refund/stock restoration. The following work remains for **Phase 6 — Transaction Engine**:

1. **Order Cancellation & Stock Restoration Trigger / RPC:**
   * When an order with a linked listing (`order_items.listing_id`) moves to `CANCELLED` or `REJECTED`:
     * Increment `listings.quantity_available = quantity_available + order_items.quantity`.
     * If `listings.status` was `SOLD_OUT`, restore status to `ACTIVE`.
     * Ensure stock restoration is idempotent (cannot restore twice if multiple updates occur).
2. **Actor-Based Transition RPCs:**
   * Farmer actions: `accept_order`, `reject_order` (with mandatory reason), `mark_preparing`, `mark_ready_for_pickup`, `mark_in_transit`.
   * Buyer actions: `confirm_delivery`, `cancel_order` (only permissible while `PENDING`), `open_dispute`.
   * Mutual cancellation rules: restrictions on cancelling once goods are in transit or prepared.
3. **Escrow / Payment State Integration:**
   * Tie order payment milestones to lifecycle state changes (e.g. escrow capture on `COMPLETED`, release/refund on `CANCELLED`/`REJECTED`).
4. **Dispute Resolution Stock Handlers:**
   * Rules for restocking vs. writing off produce when an order is resolved under dispute.
