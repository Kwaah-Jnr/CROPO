# Cropo — Full Project Audit vs CROPO_BUILD_PLAN.md

Audit date: 2026-10-04. Scope: all of `src/`, the 7 Supabase migrations, `scripts/`,
config, and a read-only check of the live public data.

> [!NOTE]
> **How findings were established.** Items marked **[verified]** were observed directly
> (live data query, build/test output, file contents). Items marked **[static]** come from
> reading code/SQL and reasoning about it. I did **not** exercise the RLS/RPC findings
> against the live database (that would create more test rows), so treat **[static]**
> items as high-confidence but unproven until a regression test is written.

---

## 1. Overall verdict

The **foundation is solid**: deny-by-default RLS, role taken from the DB, guard triggers,
atomic order RPCs with row locks, safe redirects, no service-role key in code, secrets
git-ignored, and typecheck/lint/build all clean.

The problems are not in the plumbing. They are in **business logic gaps, a few
permissive RLS grants, unsupported UI claims, and plan items that were marked done but
are only partly built.** The biggest practical risk right now is **test data sitting in
the live public marketplace**.

### Plan phase status

| Plan phase | Status | Main gaps |
|---|---|---|
| 2 Foundation | Done | Email confirmation off in live project; `SITE_URL` defaults to localhost |
| 3 Public site | Mostly done | Missing Quantity + Verified filters; no SEO files; design-rule breaches; test data live |
| 4 Farmer | Partly done | **No verification workflow, no Delete listing**; silent photo failures; lost-update on quantity |
| 5 Buyer | Mostly done | False "will be notified" claim; RLS lets buyer edit farmer quotes; Buy Now ignores delivery flag |
| 6 Transaction engine | Not started (as instructed) | But Phase 5 already created live hazards (see H2, H5) |
| 7 Admin | Stub only | Hard-coded `0` metrics; 6 nav links go to 404 |
| 8 Audit / deploy | Pending | — |

---

## 2. High severity

### H1 — Test data is live in the public marketplace **[verified]**
Anonymous query against the live project returned:
- **7 active listings; 5 are test rows** ("Test Cassava" ×3, "Yellow Maize Batch A" ×2).
- **27 public farmer profiles; ~24 are test accounts** ("Repro Farmer" ×10,
  "Test SignOut Farmer" ×7, "Test Farmer" ×4, "Kwame Farmer A/B" ×4).

Cause: every `verify-*.ts` script signs up real users against the live Supabase project
and never cleans up. The plan says *"Never invent… use realistic demo data only where
necessary"* and the checklist says *"No fake statistics"*. Public visitors currently see
test inventory.

> [!WARNING]
> **Part of this is from my own work.** The "Repro Farmer" ×10 and "Test SignOut Farmer"
> ×7 accounts were created by the sign-out debugging and verification scripts I ran in the
> previous task. I should have flagged that cleanup was needed.

**Fix:** delete test users/listings (needs your approval; `orders` use `ON DELETE
RESTRICT`, so users with orders must be removed in order). Then point tests at a separate
Supabase project, or add cleanup using a server-only service key kept out of the app.

### H2 — Stock is consumed at order creation, with no way to give it back **[static]**
`create_buy_now_order` and `accept_offer_and_create_order` subtract stock immediately.
Nothing ever restores it:
- No trigger on `orders` for `REJECTED` / `CANCELLED`.
- **No action or RPC exists to move an order out of `PENDING`.** A Buy Now order stays
  `PENDING` forever; the farmer has no accept/reject control, and the stock is gone.

This is Phase 6 scope, but the hazard is **already live** because Buy Now ships today.
**Fix in Phase 6:** a DB trigger that restores `quantity_available` on cancel/reject, and
the order-transition RPCs with actor rules (who may do which transition).

### H3 — RLS column grants let parties tamper with each other's quotes **[static]**
`rls.sql` grants `UPDATE (quantity, price_per_unit, available_date, message, status)` on
`request_offers` to every authenticated user. Two policies sit on top:
- `request_offers_update_buyer` (buyer): only checks `status in ('ACCEPTED','REJECTED')`.
  **A buyer can PATCH a farmer's quote to a new price/quantity while accepting it**, or
  mark it `ACCEPTED` directly with **no order created**.
- `request_offers_update_own_pending` (farmer): allows changing price/quantity while
  `PENDING`. **A farmer can reprice a quote after the buyer has viewed it**, so the buyer
  accepts a different price than they saw (the RPC reads the row at accept time).

Similarly `offers_update_farmer` lets a farmer set `ACCEPTED` directly, bypassing
`accept_offer_and_create_order`, leaving an "accepted" offer with no order.

**Fix:** revoke column updates on price/quantity for `request_offers`; make `status`
transitions go only through the RPCs (no direct `UPDATE` policy for `ACCEPTED`).

### H4 — `accept_request_offer_and_create_order` is under-validated **[static]**
- Does not check `buying_requests.status = 'OPEN'`, so a **cancelled/closed** request can
  still be accepted.
- Sibling quotes stay `PENDING` after one is accepted, so a **second order can be created
  for the same request**.
- If the quote references a `listing_id`, stock is **neither checked nor decremented**
  (overselling).
- Farmers see their quote as pending indefinitely.

### H5 — Email confirmation appears disabled in the live project **[verified]**
`signUp` returned a session immediately and the created users show
`email_confirmed_at` set. Anyone can register with an address they do not own. Related:
`env.ts` defaults `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000`, so if it is unset in
production, confirmation links will point at localhost with no error.

---

## 3. Medium severity

| # | Finding | Where |
|---|---|---|
| M1 | **Lost update:** edit form re-saves the whole `quantity_available`. If a buyer buys 40 of 100 while the farmer has the form open, saving resets stock to 100 → oversell. **[static]** | `updateListing` |
| M2 | **Verification workflow missing (plan Phase 4).** No action writes `verification_submissions`, no document upload exists, and farmers cannot set `PENDING` (trigger blocks it). The `PENDING` state is unreachable. The page says "Complete Farm Holdings to submit" (nothing to submit) and claims documents are "strictly encrypted… in private buckets" though none are collected. **[verified]** | `farmer/verification/page.tsx` |
| M3 | **Delete listing missing (plan Phase 4).** No delete action/UI. `ListingStatusToggle` has a dead `REMOVED` branch; RLS forbids farmers setting `REMOVED` anyway. Hard delete would fail for any listing with offers (`offers.listing_id ON DELETE RESTRICT`). **[verified]** | toggle, RLS |
| M4 | **Marketplace filters incomplete.** Plan lists Quantity and Verified-farmer filters; neither exists. **[verified]** | `marketplace-filters.tsx` |
| M5 | **Unsupported claims in the UI** (plan: "do not invent"): admin dashboard shows hard-coded **0** for Pending Verifications / Active Listings / Disputes / Orders (there are 7 active listings); "Verified farmers will be notified" (no notification system exists); fallback labels "Commercial Farm" / "Registered Farm" shown when no farm exists. **[verified]** | `admin/page.tsx`, `buyer.ts`, `marketplace.ts` |
| M6 | **Buy Now ignores `delivery_available`.** A buyer can choose DELIVERY on a pickup-only listing. **[static]** | `create_buy_now_order` |
| M7 | **Silent-failure patterns:** photo uploads skipped for bad type/size with no message, and `listing_images` insert result is ignored (orphaned files, still reports success); `rejectOffer`, `withdrawOffer`, `rejectFarmerRequestOffer` report success when 0 rows changed; `toggleSavedSupplier` ignores errors; data-layer functions return `[]` on DB error, so an outage looks like an honest empty state (this is how the earlier `getFarmerOffers` bug was hidden). **[verified]** | actions, `lib/data/*` |
| M8 | **Raw RPC error text returned to the browser** (`failure(error.message)`). **[verified]** | `acceptOffer`, `createBuyNowOrder`, `acceptFarmerRequestOffer` |
| M9 | **Type-safety bypassed** despite generated types: 6× `supabase as any` in `farmer.ts`, many `as unknown as` casts in `lib/data/*`. Weakens the plan's "strict TypeScript" and hides schema drift. **[verified]** | `farmer.ts`, data layer |
| M10 | **Performance:** no pagination on any list; marketplace text search runs in memory after loading all active listings (the `search` tsvector + GIN index is never used); farmer public page loads every listing then filters; `ilike` region filter doesn't escape `%`/`_`. **[verified]** | `marketplace.ts` |
| M11 | **Design-rule breaches** (plan §12): `backdrop-blur` on header, badges and 3 modals; a `bg-gradient-to-t` on the landing hero; ~25 spinning `Loader2` icons ("do not use spinning icons"); `animate-pulse` skeletons; zoom/fade modal animations; `rounded-2xl`/`shadow-2xl`. Three hand-rolled modals have no `role="dialog"`, `aria-modal`, Escape handling or focus trap (accessibility). **[verified]** | components |
| M12 | **SEO not ready:** no `robots`, `sitemap`, Open Graph, icons or `metadataBase`; the only landing image is a single hot-linked Unsplash URL. **[verified]** | `app/` |
| M13 | **Notifications not implemented** (table exists, nothing writes to it). Plan MVP/Phase 6 item. | — |

---

## 4. Low severity / hygiene

- **L1 — My proxy fix, nuance.** The sign-out fix skips `updateSession` whenever a
  `next-action` header is present. That header is client-controlled, so a request can add
  it to skip the proxy's *optimistic* redirect gate. Real protection still holds
  (`requireProfile`/`requireRole` in layouts and `authorize()` in every action), so this
  is defense-in-depth only, not a bypass. Session refresh for actions relies on the
  action's own Supabase client, which can write cookies.
- **L2 — Uploads.** File extension taken from the client filename and MIME from the
  client; no magic-byte check; no upload cap per farmer; the bucket is public, so photos
  of DRAFT/REMOVED listings are reachable by direct URL.
- **L3 — No duplicate/rate controls.** Multiple pending offers per buyer per listing
  allowed (unlike `request_offers`); no rate limiting on signup, offers or requests.
- **L4 — State machine gaps.** `DISPUTED` is not reachable from `ACCEPTED`, `CONFIRMED`
  or `READY_FOR_PICKUP`, and there is no insert path for `disputes` at all; `reviews` and
  `disputes` tables are unused.
- **L5 — Public views** use owner rights (`security_barrier`, not `security_invoker`).
  Intentional and documented, but Supabase's linter will flag it.
- **L6 — Tests.** All scripts hit the live DB; RLS checks are anonymous-only. There are
  **no authenticated cross-user (IDOR) tests** for orders, offers or request offers, which
  is exactly where H3/H4 live. No test runner, no CI.
- **L7 — Repo clutter.** 9 report/architecture `.md` files at root (several overlapping);
  a 134-byte fake `public/images/placeholder-crop.jpg` stub.
- **L8 — Metric inconsistency.** Buyer dashboard counts `DELIVERED` as completed; farmer
  earnings count only `COMPLETED`.
- **L9 — Account deletion** is blocked for anyone with orders (`ON DELETE RESTRICT`).
- **L10 — Folder layout** differs from the plan sample (`actions/auth|buyer|farmer.ts`
  instead of `listings|offers|requests|orders|profiles.ts`; data in `lib/data`). The plan
  explicitly allows adapting, so this is acceptable.

---

## 5. What is correct (keep as-is)

- Role is read from `profiles.role` in the DB, never from client or JWT metadata; role
  column is trigger- and grant-protected; ADMIN cannot self-register.
- Verification fields are admin-only via trigger.
- Order creation only through `SECURITY DEFINER` RPCs with `FOR UPDATE` locks and
  `search_path = ''`; no direct `INSERT` on `orders`/`order_items`.
- DB-enforced order state machine plus automatic status history.
- Every mutating action calls `authorize()` first; ownership also filtered in queries.
- `safeRedirectPath` used on login and email-confirm routes.
- No service-role key in source; `.env.local` is git-ignored and untracked.
- Private `verification-documents` bucket; owner-folder storage policies.
- Typecheck, lint and production build pass; 134 verification assertions pass.

---

## 6. Recommended order of work

1. **Now (no feature work):** clean test data (H1); decide on email confirmation + set
   `NEXT_PUBLIC_SITE_URL` (H5); fix wording that claims things that don't exist (M5).
2. **Before Phase 6 ships orders:** tighten `request_offers`/`offers` grants and policies
   (H3); harden the request-offer RPC (H4); add order-transition RPCs, stock restore, and
   delivery check (H2, M6) — these belong in Phase 6.
3. **Finish Phase 4/5 leftovers:** verification submission + document upload (M2); Delete
   listing as soft-remove via RPC (M3); Quantity and Verified filters (M4); surface upload
   errors and stop returning raw RPC messages (M7, M8); quantity lost-update guard (M1).
4. **Phase 7 / 8:** admin pages with real queries; remove dead nav until built; pagination
   + use the tsvector index (M10); design-rule cleanup and accessible dialogs (M11); SEO
   files (M12); authenticated IDOR test suite on a separate test project (L6).
