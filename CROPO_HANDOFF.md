# CROPO — Development Handoff

**Project:** Cropo  
**Product:** Ghana-focused agricultural trading marketplace  
**Current Phase:** Phase 5 complete, Remediation Passes 1–4 complete; **Phase 6 is next**  
**Status:** Hardened, Verified, and Clean — Ready for Phase 6 (Transaction Engine & Stock Lifecycle)  
**Last verified:** 2026-10-05

---

## 1. Project Overview

Cropo is a digital agricultural trading and fulfillment marketplace designed to connect farmers with buyers in Ghana and reduce post-harvest losses.

Core marketplace model:

- Farmers list agricultural produce.
- Buyers browse available produce.
- Buyers can make offers.
- Buyers can post buying requests.
- Farmers can respond to buying requests.
- Cropo provides verification, transaction controls, and eventually logistics and payment/escrow capabilities.

The product should feel like a **professional agricultural marketplace + fintech usability + practical African business software**. It must not look like a generic AI-generated SaaS template.

---

## 2. Current Development Status

### Phase 1 — Architecture
Complete and approved.

### Phase 2 — Foundation
Complete, verified, and committed to Git.

Includes Next.js App Router, TypeScript strict mode, Tailwind CSS, shadcn/ui, Lucide, Supabase, PostgreSQL, Supabase Auth, Supabase Storage, RLS, Server Actions, role-based authorization, database migrations, authentication flows, and security foundations.

### Phase 3 — Public Website
Complete.

Public routes:

- `/`
- `/marketplace`
- `/marketplace/[id]`
- `/farmers/[id]`
- `/how-it-works`
- `/about`
- `/login`
- `/signup`

### Phase 3 Verification
Complete and approved.

Verification covered marketplace access, filters, listing details, farmer privacy, anonymous access restrictions, empty marketplace behavior, dynamic freshness, order state alignment, unauthorized table access, TypeScript, ESLint, and production build.

Result: **37 tests passed, 0 failed**; TypeScript, lint, and production build all clean.

### Phase 4 — Farmer Dashboard & Produce Listing Management
Complete and verified.

Includes:
- Farmer dashboard overview with real-time operational metrics & honest empty state guarantees
- My Listings management with status tabs (All, Active, Paused, Sold Out, Removed) and quick status toggle
- Add/List New Produce with multi-image upload directly to Supabase Storage (`listing-images` bucket)
- Edit Listing with ownership verification, photo addition, photo deletion, and form validation
- Listing validation with Zod schemas for Ghanaian agricultural context (units, grades, regions)
- Farmer Profile & Farm Holdings management with GPS address, region, district, community, and acreage
- Verification status page explaining verification criteria, document safety, and phone privacy protections
- Incoming Offers received from commercial buyers with status and details
- Orders view displaying the 11 backend order states
- Earnings overview with completed payouts, pending escrow settlements, and bank/MoMo security notes
- Targeted Phase 4 verification test suite (`scripts/verify-phase4.ts`) passing 28/28 tests
- 0 TypeScript compilation errors (`tsc --noEmit`), 0 ESLint warnings/errors, clean production build

### Phase 5 — Commercial Buyer Dashboard, Offers & Order Flow
Complete, verified, and approved.

Includes:
- Buyer dashboard overview with active order, offer, and request tracking
- Produce discovery & procurement actions on marketplace listings
- Direct Buy Now order flow backed by atomic `create_buy_now_order` RPC
- Make Offer flow with negotiation messaging and offer withdrawal
- Buying Requests (RFQs) creation, management, cancellation, and farmer quote review
- Saved Suppliers management with bookmark toggling
- Orders view covering all 11 backend order lifecycle states with detailed line items
- Atomic order creation RPCs (`create_buy_now_order`, `accept_offer_and_create_order`, `accept_request_offer_and_create_order`)
- Comprehensive Phase 5 verification test suite (`scripts/verify-phase5.ts`) passing 29/29 tests

### Remediation Pass 1 — Harden Produce Offers & Request Quotes (H3 & H4)
Complete, verified, and committed (`f2b45c79f9d1cfda81b5b5eab925794ccbaee848`).

Includes:
- Database migration `20261004000800_harden_offers_and_request_offers.sql` applied to Supabase
- Revocation of excessive update column grants on `request_offers` (quantity and price are strictly immutable)
- Elimination of direct `status = 'ACCEPTED'` updates via PostgREST; all acceptances forced through atomic RPCs
- Request `OPEN` validation to prevent accepting quotes on closed/cancelled requests
- Automatic transition of competing sibling quotes to `REJECTED` upon winning quote acceptance
- Atomic row locking (`FOR UPDATE`), stock verification, and decrement when quotes reference produce listings
- End-to-end security test suite (`scripts/verify-pass1-security.ts`) passing 30/30 tests

### Remediation Pass 2 — Repair Sign-Out Server Action Flow
Complete, verified, and committed (`6dbea65f9f84a941aec6c8d116e234f430fea188`).

Includes:
- Resolved runtime stream abort error (*"An unexpected response was received from the server"*)
- Declared `SignOutButton` on the client boundary (`"use client"`) using React `useTransition` for clean RPC submission
- Preserved progressive enhancement via `<form action={signOut}>` for SSR and non-JS clients
- Added pending spinner and click debouncing
- Verified cookie revocation (`Max-Age=0`), redirect to `/login`, and protected route rejection
- Sign-out regression suite (`scripts/verify-signout.ts`) passing 20/20 tests

### Remediation Pass 3 — Buy Now Delivery & Stock Integrity (M6 & H2)
Complete, verified, and committed (`449d593ce4b959c02cbf274c6c516021ea663c20`).

Includes:
- Database migration `20261004000900_enforce_buy_now_delivery_and_stock.sql` applied to Supabase
- Enforced M6 at database level: pickup-only listings (`delivery_available = false`) strictly reject `DELIVERY` fulfillment requests with SQL code `23514`
- Ensured stock cannot be consumed by invalid fulfillment selections
- Verified atomic row locking (`FOR UPDATE`) preventing overselling and race conditions under concurrent load
- Pass 3 verification suite (`scripts/verify-pass3-stock.ts`) passing 25/25 tests

### Remediation Pass 4 — Complete Farmer Verification Workflow (M2)
Complete, verified, and committed (`5cb87542d992f9748b6cbf7903cff972412803b9`).

Includes:
- Database migration `20261004001000_farmer_verification_workflow.sql` and `20261004001100_grant_service_role.sql` applied to Supabase
- Farmer document upload to private `verification-documents` bucket under `${farmerId}/*` folder ownership
- Database trigger `sync_verification_submission` orchestrating standing transitions (`UNVERIFIED` → `PENDING` → `VERIFIED` / `REJECTED`)
- Hardened `guard_verification_fields()` blocking farmer self-verification and direct client tampering (code `42501`)
- Administrative review RPC `admin_review_verification_submission` and Server Action `reviewVerificationSubmission`
- Interactive `VerificationForm` and audit trail `VerificationHistory` in `farmer/verification/page.tsx`
- Private signed URLs for document inspection via `getVerificationDocumentSignedUrl`
- Shielded national ID and document paths from public views (`public_farmer_profiles`)
- Pass 4 verification suite (`scripts/verify-pass4-verification.ts`) passing 29/29 tests

---

## 3. Current Next Task

# PHASE 6 — Transaction Engine & Full Stock Lifecycle

Implement and verify Phase 6 when instructed. Do not automatically proceed to Phase 6.

Key upcoming objectives:
1. Automated stock restoration triggers when an order transitions to `CANCELLED` or `REJECTED`
2. Actor-based transition RPCs (`accept_order`, `reject_order`, `mark_preparing`, `mark_ready_for_pickup`, `mark_in_transit`, `confirm_delivery`)
3. Escrow and payment integration
4. Dispute resolution and produce restock / write-off rules

---

## 4. Product Roles

### Farmer

Farmers should be able to manage their profile and farm information, complete verification, create and manage produce listings, upload listing photos, view offers, orders, and supported earnings information.

### Buyer

Later phases will support browsing, offers, buying requests, orders, saved suppliers, and transaction management.

### Admin

Later phases will manage farmers, buyers, listings, orders, payments, logistics, disputes, verification, analytics, and settings.

---

## 5. Approved Transaction Model

Cropo supports:

1. Buy Now
2. Make Offer
3. Buyer Request / Supplier Offers

Buy Now orders start at `PENDING`.

Accepted offer/request-originated orders start at `ACCEPTED`.

Do not bypass the approved transaction architecture.

---

## 6. Order State Machine

The backend uses these detailed states:

### Stage 1 — Initiation & Agreement

- `PENDING`
- `ACCEPTED`
- `CONFIRMED`

### Stage 2 — Harvest & Packing

- `PREPARING`

### Stage 3 — Dispatch & Haulage

- `READY_FOR_PICKUP`
- `IN_TRANSIT`

### Stage 4 — Receipt & Completion

- `DELIVERED`
- `COMPLETED`

### Safeguard / Exception States

- `CANCELLED`
- `REJECTED`
- `DISPUTED`

Do not invent alternate order states or bypass the state machine.

---

## 7. Database

Current core tables:

- `profiles`
- `farmer_profiles`
- `buyer_profiles`
- `farms`
- `crop_categories`
- `listings`
- `listing_images`
- `offers`
- `buying_requests`
- `request_offers`
- `orders`
- `order_items`
- `reviews`
- `notifications`
- `saved_suppliers`
- `verification_submissions`
- `disputes`
- `order_status_history`

If Phase 4 requires database changes, create a new migration. Do not rewrite existing migrations simply to make a feature easier.

---

## 8. Supabase

Supabase is hosted and connected through the Supabase CLI.

The project uses:

- Supabase Auth
- PostgreSQL
- RLS
- Storage

Do not introduce local Supabase/Docker unless explicitly requested.

---

## 9. Authentication & Authorization

Existing auth routes:

- `/login`
- `/signup`

Authentication includes sign up, sign in, sign out, email confirmation flow, role-aware redirects, server-side authorization, and protected dashboard routes.

Roles:

- `FARMER`
- `BUYER`
- `ADMIN`

Authorization must remain server-side. A farmer may only manage resources they own. Do not weaken RLS to solve UI problems.

---

## 10. RLS / Security Status

RLS is enabled on the core tables.

Anonymous users can access only intentionally public marketplace data and a restricted public farmer profile view.

Anonymous access is blocked for:

- `profiles`
- `farmer_profiles`
- `buyer_profiles`
- `orders`
- `order_items`
- `order_status_history`
- `offers`
- `request_offers`
- `buying_requests`
- `saved_suppliers`
- `verification_submissions`
- `disputes`
- `notifications`

Private phone numbers, emails, verification documents, and internal data must remain protected.

---

## 11. Public Farmer Profile

Public farmer information may include:

- Full name
- Region
- City
- Avatar
- Bio
- Years farming
- Verification status

Do not expose private contact information, verification documents, or sensitive internal information.

---

## 12. Storage

Supabase Storage buckets include:

- `listing-images`
- `avatars`
- `verification-documents`

Listing images must follow ownership and authorization rules. Verification documents are private and must never be publicly exposed.

---

## 13. Marketplace Data Policy

**Do not use fictional marketplace inventory that looks like real production data.**

If there are no real listings, show an honest empty state such as:

> No active produce listings at the moment.

or:

> New Harvests Arriving Soon.

Do not invent farmer identities, prices, quantities, verification badges, locations, transactions, earnings, reviews, partnerships, or business statistics.

Demo/test data must be explicitly identifiable as demo data.

---

## 14. Marketplace Freshness

These routes are verified dynamic:

- `/marketplace`
- `/marketplace/[id]`
- `/farmers/[id]`
- `/`

New or updated Supabase listings should appear without a new Vercel deployment. Do not accidentally convert these pages back to stale static rendering.

---

## 15. Approved Design System

### Colors

- Deep natural green — primary
- Warm harvest amber — accent
- Warm white / light neutral surfaces
- Dark charcoal text

### Style

- Modern African agri-tech
- Professional marketplace
- Fintech-quality usability
- Clean spacing
- Moderate border radius
- Restrained shadows
- Strong typography hierarchy
- Real agricultural photography
- Static Lucide icons

### Avoid

- Glassmorphism
- Decorative gradients
- Floating blobs
- Excessive rounded containers
- Huge marketing typography
- Cartoon imagery
- AI-generated agricultural imagery
- Animated icons
- Excessive motion
- Fake testimonials
- Fake statistics
- Fake partnerships

The website should feel credible and commercially useful.

---

## 16. Photography Rules

Use authentic, high-quality agricultural photography. Properly licensed sources such as Unsplash or Pexels may be used where appropriate.

Do not use AI-generated farmers, agricultural workers, crops, produce, or farms.

Do not use misleading photography that implies a real Cropo farmer or farm if it is only generic stock imagery.

---

## 17. Phase 4 Scope

### Farmer Dashboard

Implement:

- Overview
- Active listings
- Pending offers
- Orders
- Earnings/financial summary where supported
- Verification status
- Quick action to list produce

### My Listings

Farmers should be able to:

- View their listings
- See listing status
- Open listing details
- Edit their own listings
- Deactivate/manage listings
- Create new listings

### Add Produce

Support:

- Crop
- Variety where applicable
- Quantity
- Unit
- Price
- Location
- Availability/ready date
- Quality grade
- Photos
- Delivery availability
- Relevant description/specifications

Validate all important inputs server-side.

### Listing Images

Use Supabase Storage and validate ownership, file type, file size, and upload authorization.

### Farmer Profile

Support relevant farmer information such as name, bio, region, city/district, farming experience, farm information, and verification status.

Do not expose private verification documents.

---

## 18. Phase 4 Security Requirements

Verify that:

- A farmer can create their own listing.
- A farmer cannot create a listing for another farmer.
- A farmer can edit only their own listing.
- A farmer cannot edit another farmer's listing.
- A farmer can only manage their own images.
- A buyer cannot access farmer-only management routes.
- Anonymous users cannot access the farmer dashboard.
- Admin access remains protected.
- RLS remains enabled.
- Server-side authorization remains enforced.
- Important inputs are validated.
- Storage permissions remain correct.

---

## 19. Phase 4 Testing Requirements

Test:

- Farmer authorization
- Farmer dashboard access
- Listing creation
- Listing validation
- Listing ownership
- Listing editing
- Listing deactivation
- Listing image upload
- Listing image permissions
- Unauthorized farmer access
- Buyer attempting farmer-only access
- Anonymous attempting farmer-only access
- Private farmer data protection

Then run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Also run the relevant existing verification suites.

---

## 20. Git

Git is initialized.

Phase 2 commit:

`3d5cab1`

After Phase 4 is complete, create a clean commit. Recommended message:

`feat: build Cropo farmer experience`

Before committing:

- Check `git status`
- Review changed files
- Confirm no secrets are committed
- Confirm `.env.local` is ignored
- Run verification commands

---

## 21. Environment Variables

`.env.local` belongs in the project root.

Expected application variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Development/security variables may include:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

Supabase CLI variables may include:

```env
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
SUPABASE_DB_PASSWORD=
```

Never expose service-role keys to the browser. Never commit `.env.local`.

---

## 22. Important Development Rules

1. Read this file before making changes.
2. Read `CROPO_BUILD_PLAN.md` before making changes.
3. Inspect the current repository before implementing anything.
4. Do not assume unfinished code is broken.
5. Do not rewrite working architecture unnecessarily.
6. Do not weaken security to solve UI problems.
7. Do not invent production data.
8. Do not invent business statistics.
9. Do not introduce unnecessary dependencies.
10. Prefer Server Components by default.
11. Use Client Components only where interactivity requires them.
12. Use Server Actions for appropriate writes.
13. Validate server-side.
14. Keep database transactions safe and atomic.
15. Preserve existing RLS.
16. Keep the backend suitable for future Android/iOS clients.
17. Do not automatically continue to the next phase.
18. Stop after the requested phase and provide a completion report.

---

## 23. Current Known State

| Area | Status |
|---|---|
| Architecture | Complete |
| Foundation | Complete |
| Public Website | Complete |
| Marketplace | Complete and verified |
| Authentication | Implemented |
| Database | Implemented and migration-synchronized |
| RLS | Implemented and security-tested |
| Storage | Implemented |
| Public Marketplace Freshness | Verified dynamic |
| Fake/Fallback Marketplace Data | Removed |
| Farmer Dashboard | **Next phase** |
| Buyer Dashboard | Not yet implemented |
| Complete Transaction Engine | Not yet implemented as Phase 6 |
| Admin Dashboard | Not yet implemented |
| Complete Logistics System | Not yet implemented |
| Production Payments/Escrow | Not yet implemented |

---

## 24. Phase Order

1. Architecture — COMPLETE
2. Foundation — COMPLETE
3. Public Website — COMPLETE
4. Farmer Experience — **NEXT**
5. Buyer Experience
6. Marketplace Transaction Engine
7. Admin Dashboard
8. Production Audit
9. Vercel Deployment / Production Launch

Do not skip phases unless explicitly instructed.

---

## 25. Definition of Done — Phase 4

Phase 4 is complete only when:

- Farmer dashboard works
- Farmer listings work
- Listing creation works
- Listing editing works
- Listing management works
- Listing images work
- Farmer profile management works where included
- Authorization is enforced
- RLS remains secure
- Validation is implemented
- Empty states are honest
- No fake production data is introduced
- TypeScript passes
- Lint passes
- Production build passes
- Phase 4 tests pass
- Git commit exists
- Completion report is produced

Then stop.

---

## 26. Recommended Agent Handoff Prompt

```text
You are continuing development of the Cropo production project.

Before making ANY changes:

1. Read CROPO_BUILD_PLAN.md completely.
2. Read CROPO_HANDOFF.md completely.
3. Inspect the entire existing project structure.
4. Inspect package.json and dependencies.
5. Inspect Supabase migrations/schema.
6. Inspect authentication.
7. Inspect RLS/security implementation.
8. Inspect existing routes and components.
9. Inspect Git history.
10. Determine exactly which Cropo phases are complete.

Current status:
- Phase 1: complete
- Phase 2: complete
- Phase 3: complete and verified
- Phase 4: complete and verified
- Phase 5: complete and verified
- Remediation Pass 1 (H3 & H4): complete and verified
- Remediation Pass 2 (Sign-Out): complete and verified
- Remediation Pass 3 (M6 & H2): complete and verified
- Remediation Pass 4 (M2 Farmer Verification): complete and verified
- Phase 6: next

Your task is ONLY:

PHASE 6 — Transaction Engine & Full Stock Lifecycle

Do not redesign completed Phase 3-5 functionality unless necessary for shared components or integration.

Do not weaken RLS.

Do not invent production data.

Do not generate AI agricultural imagery.

Do not proceed to Phase 7 automatically.

At the end, run TypeScript, lint, production build, and all verification test suites.

Commit the completed work.

Then provide a concise Phase 6 completion report and stop.
```

---

# Final Handoff Status

**Cropo is ready for Phase 6.**

The marketplace, farmer dashboard, buyer dashboard, and transaction foundations have been implemented and verified for:

- Public marketplace, discovery, filters, and produce detail pages
- Complete farmer experience (listings, photo storage, profile, holdings, verification, earnings)
- Commercial buyer experience (marketplace procurement, Buy Now, Make Offer, Buying Requests / RFQs, Saved Suppliers)
- Database-enforced atomic order creation (`create_buy_now_order`, `accept_offer_and_create_order`, `accept_request_offer_and_create_order`)
- Immutable offer and quote commercial terms (H3)
- Request `OPEN` validation and sibling quote auto-rejection (H4)
- Robust server-side sign-out flow across client RPC and native form submissions
- Database-enforced pickup-only fulfillment validation (`delivery_available`) (M6)
- Atomic stock reservation and concurrency protection with `FOR UPDATE` row locks (H2)
- Complete farmer verification workflow with private document uploads, anti-self-verification, and admin review (M2)
- 11-state order lifecycle architecture with automated audit history tracking
- Strict RLS isolation and sensitive credential/phone privacy protection
- Build quality (0 TypeScript errors, 0 lint warnings/errors, clean Next.js 16 production build)
- Automated verification (22 foundation + 37 public + 28 farmer + 29 buyer + 18 farmer offers + 30 Pass 1 security + 20 sign-out + 25 Pass 3 stock + 29 Pass 4 verification tests = 238 passing automated assertions)

The next major product milestone is:

> **Implement the Phase 6 Transaction Engine — actor-based order state transitions, automated stock restoration on cancellation/rejection, payment/escrow integration, and dispute handling.**

