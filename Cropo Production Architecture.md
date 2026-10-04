# Cropo — Production Architecture & AI Agent Build Plan

> **Purpose:** Give an AI coding agent a single source of truth for building Cropo step by step.
>
> **Important:** Run the phases **one at a time**. Do not give the entire document to the agent as one implementation request.

---

# 1. Product Vision

**Cropo** is a modern agricultural marketplace initially designed for Ghana and eventually other African markets.

Cropo connects:

- Farmers who want to sell agricultural produce.
- Buyers such as wholesalers, retailers, restaurants, processors, exporters, businesses, and individuals.
- Administrators who manage and moderate the marketplace.

The core problem Cropo solves:

> Farmers can have produce ready for sale but struggle to find reliable buyers quickly. Buyers can struggle to find reliable suppliers, quantities, quality, pricing, and trustworthy produce.

## Core marketplace loop

```text
Farmer lists produce
        ↓
Buyer discovers produce
        ↓
Buyer purchases or makes an offer
        ↓
Farmer accepts
        ↓
Order is created
        ↓
Order is fulfilled
        ↓
Transaction is completed
```

## Reverse-demand loop

```text
Buyer posts a buying request
        ↓
Farmers discover the request
        ↓
Farmers submit offers
        ↓
Buyer selects an offer
        ↓
Order is created
```

---

# 2. Production Technology

Use:

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel

Use Server Actions where appropriate.

Avoid unnecessary backend infrastructure.

The application must be suitable for deployment on Vercel.

---

# 3. Architecture Principles

Build this as a serious production application, not a demo.

Requirements:

- Clean modular architecture
- Reusable components
- Business logic separated from presentation
- Strict TypeScript
- Proper input validation
- Server-side authentication
- Server-side authorization
- Supabase Row Level Security
- Never trust client-supplied roles
- Never expose Supabase service-role credentials to the browser
- Use server components where appropriate
- Minimize unnecessary client components
- Mobile-first responsive design
- Accessible UI
- SEO-friendly public pages
- Optimized images
- Good performance
- Backend reusable for future Android/iOS clients
- Do not add infrastructure unless there is a real requirement

---

# 4. User Roles

## Farmer

Can:

- Create profile
- Create farm
- Submit verification
- List produce
- Upload produce photos
- Edit listings
- Pause listings
- Receive offers
- Accept/reject offers
- Manage orders
- View earnings
- Manage profile

## Buyer

Can:

- Create profile
- Browse marketplace
- Search and filter produce
- View farmer profiles
- Purchase produce
- Make offers
- Create buying requests
- View farmer offers
- Manage orders
- Save suppliers
- Manage profile

## Admin

Can:

- Manage farmers
- Manage buyers
- Verify users
- Manage listings
- Manage orders
- Handle disputes
- Manage categories
- View analytics

---

# 5. Core Database Model

Create normalized PostgreSQL tables using UUID primary keys.

Core entities:

```text
profiles
farmer_profiles
buyer_profiles
farms
crop_categories
listings
listing_images
offers
buying_requests
request_offers
orders
order_items
reviews
notifications
```

Include:

- Primary keys
- Foreign keys
- Appropriate indexes
- Constraints
- Timestamps
- Controlled status values
- `created_at`
- `updated_at`

---

# 6. Listing Model

Each listing should support:

- Crop name
- Category
- Variety
- Quantity
- Unit
- Price
- Grade
- Harvest date
- Available date
- Location
- Description
- Images
- Delivery availability
- Farmer
- Farm
- Verification status
- Listing status

Example:

```text
Fresh Tomatoes

1,200 kg available
GH₵ 8.50 / kg
Grade A
Harvested: September 28
Kumasi, Ashanti Region

✓ Verified Farmer
🚚 Delivery Available
```

---

# 7. Buying Request Model

Each buying request should support:

- Crop
- Quantity
- Unit
- Desired grade
- Destination
- Required date
- Target price
- Description
- Buyer
- Request status

Example:

```text
Buyer needs:

Product: Tomatoes
Quantity: 5,000 kg
Grade: A
Destination: Accra
Required date: October 10
Target price: Optional
```

---

# 8. Transaction Methods

Support three transaction methods:

1. **Buy Now**
2. **Make Offer**
3. **Buyer Request**

---

# 9. Order State Machine

Use controlled order states:

```text
PENDING
    ↓
ACCEPTED
    ↓
CONFIRMED
    ↓
PREPARING
    ↓
READY_FOR_PICKUP
    ↓
IN_TRANSIT
    ↓
DELIVERED
    ↓
COMPLETED
```

Also support appropriate exception/terminal states:

```text
CANCELLED
DISPUTED
REJECTED
```

Only valid state transitions may be performed.

---

# 10. Route Architecture

## Public

```text
/
/marketplace
/marketplace/[id]
/farmers/[id]
/how-it-works
/about
/login
/signup
```

## Farmer

```text
/dashboard/farmer
/dashboard/farmer/listings
/dashboard/farmer/listings/new
/dashboard/farmer/offers
/dashboard/farmer/orders
/dashboard/farmer/earnings
/dashboard/farmer/profile
/dashboard/farmer/verification
```

## Buyer

```text
/dashboard/buyer
/dashboard/buyer/marketplace
/dashboard/buyer/requests
/dashboard/buyer/requests/new
/dashboard/buyer/offers
/dashboard/buyer/orders
/dashboard/buyer/suppliers
/dashboard/buyer/profile
```

## Admin

```text
/dashboard/admin
/dashboard/admin/farmers
/dashboard/admin/buyers
/dashboard/admin/listings
/dashboard/admin/orders
/dashboard/admin/disputes
/dashboard/admin/analytics
```

---

# 11. Target Folder Structure

Use a clean structure such as:

```text
src/
├── app/
│   ├── page.tsx
│   ├── marketplace/
│   ├── farmers/
│   ├── login/
│   ├── signup/
│   └── dashboard/
│       ├── farmer/
│       ├── buyer/
│       └── admin/
│
├── components/
│   ├── ui/
│   ├── marketplace/
│   ├── farmer/
│   ├── buyer/
│   ├── admin/
│   └── shared/
│
├── actions/
│   ├── listings.ts
│   ├── offers.ts
│   ├── requests.ts
│   ├── orders.ts
│   └── profiles.ts
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── marketplace/
│   ├── validation/
│   └── utils/
│
├── types/
│
└── config/
```

Adapt this structure if the existing repository has a better established convention. Do not create duplicate architecture unnecessarily.

---

# 12. Design System — Non-Negotiable

Cropo is intended for public deployment.

It must look like a **credible agricultural trading company**, not an AI-generated startup template.

## Overall feeling

Cropo should feel:

- Professional
- Trustworthy
- Established
- Practical
- Modern
- Agricultural
- African
- Commercially credible

Think:

> **Professional marketplace + fintech usability + agricultural business**

Not:

> **AI startup landing page**

## Photography

Use high-quality **real agricultural photography** wherever possible.

Preferred imagery:

- Real farmers
- Real farms
- Harvested crops
- Tomatoes
- Onions
- Peppers
- Plantains
- Yams
- Agricultural markets
- Produce warehouses
- Agricultural transportation

Where appropriate, use imagery representative of Ghana and West Africa.

Avoid:

- Obviously AI-generated people
- Surreal scenes
- Cartoon illustrations
- Artificial-looking produce
- Generic corporate imagery where authentic agricultural photography works better

Use consistent aspect ratios and professional cropping.

## Icons

Use static, professional icons such as Lucide.

**Do not animate icons.**

Do not use:

- Bouncing icons
- Spinning icons
- Floating icons
- Animated illustrations
- Emoji as interface icons

Animations should be minimal and functional only.

Acceptable examples:

- Subtle hover state
- Simple button transition
- Simple modal transition

Avoid animation that exists purely for decoration.

## Colors

Use a restrained agricultural palette.

Primary:

**Deep natural green**

Accent:

**Warm harvest yellow/orange**

Background:

**Warm white / light neutral**

Text:

**Dark charcoal**

Borders:

**Light neutral gray**

Do not make the entire interface green.

Green should identify Cropo and important actions rather than dominate every surface.

## Typography

Use a professional modern sans-serif.

Use clear hierarchy:

- Strong page titles
- Readable section headings
- Comfortable body text
- Compact metadata
- Clear prices and quantities

Avoid oversized marketing typography that makes the site feel like a template.

## Cards

Use cards where they improve organization.

Do not put every piece of information inside a floating rounded card.

Cards should generally have:

- Subtle border
- Minimal shadow
- Moderate corner radius
- Strong internal spacing

Avoid:

- Huge rounded containers
- Excessive shadows
- Floating cards everywhere
- Glassmorphism
- Translucent panels

## Marketplace

The marketplace should feel like a real trading platform.

Listing cards should prioritize:

1. Produce image
2. Crop name
3. Price
4. Available quantity
5. Location
6. Grade/quality
7. Verification status
8. Farmer
9. Availability/delivery

Do not overload cards with decorative elements.

## Trust

Trust is a major part of Cropo.

Use restrained badges such as:

- Verified Farmer
- Verified Buyer
- Farm Verified
- Business Verified

Do not invent trust statistics.

Do not claim:

- "10,000+ farmers"
- "50,000 tonnes sold"
- "98% satisfaction"

unless real data exists.

For prototype/demo content, clearly identify sample data.

## Navigation

Keep navigation straightforward.

Users should immediately understand:

- Marketplace
- Sell Produce
- Buy Produce
- Buying Requests
- Orders
- Dashboard

## Content

Use realistic, concise copy.

Avoid generic AI phrases such as:

> "Revolutionizing the future of agriculture."

> "Empowering farmers with cutting-edge technology."

> "Unlock the power of innovation."

Prefer practical language:

> "Find buyers for your produce."

> "Source fresh produce directly from verified farmers."

> "List your harvest and connect with buyers."

> "Track your orders from confirmation to delivery."

---

# 13. MVP Scope

Build first:

```text
Authentication
        ↓
Farmer profiles
        ↓
Buyer profiles
        ↓
Marketplace
        ↓
Listings
        ↓
Offers
        ↓
Buying requests
        ↓
Orders
        ↓
Basic dashboards
```

Do NOT build initially:

- Real payment processing
- Escrow
- Mobile money integration
- Logistics tracking
- Driver management
- WhatsApp integration
- SMS integration
- AI recommendations
- Native mobile applications

Architect the application so these can be added later.

---

# 14. Step-by-Step AI Agent Prompts

## PHASE 1 — Architecture

```text
You are the senior software architect for Cropo.

Read the Cropo Production Architecture specification before making changes.

Do NOT implement the full UI yet.

First inspect the existing repository and identify:

1. Current framework and dependencies
2. Existing files and structure
3. Existing functionality that should be preserved
4. Anything that conflicts with this specification

Then produce:

- Final architecture
- Folder structure
- Database schema
- Authentication strategy
- Authorization/RLS strategy
- Route map
- Component architecture
- Validation strategy
- Deployment strategy

Do not rewrite working code unnecessarily.
Do not introduce unnecessary libraries.
Do not invent features.

After presenting the architecture, stop and wait for the next phase.
```

---

## PHASE 2 — Foundation

```text
Implement the approved Cropo architecture.

Set up:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage

Implement:

- Authentication
- Signup
- Login
- Logout
- Protected routes
- Server-side role checks
- Database migrations
- Supabase RLS
- Shared database utilities
- Validation
- Error handling
- Loading/error boundaries
- Environment variable handling
- Reusable layout/navigation foundations

Roles:

FARMER
BUYER
ADMIN

Farmers must only manage their own private data and listings.

Buyers must only manage their own private data, requests, offers and orders.

Admin functionality must be protected server-side.

Never expose service-role credentials.

Never hardcode secrets.

Do not build the complete marketplace yet.

Verify:

- TypeScript
- Lint
- Production build

before stopping.

Report any manual configuration I must perform.
```

---

## PHASE 3 — Public Website

```text
Build the public Cropo website using the production design system.

Pages:

/
/marketplace
/marketplace/[id]
/farmers/[id]
/how-it-works
/about
/login
/signup

Cropo must look like an established agricultural marketplace.

It must NOT look AI-generated.

Do not use:

- Excessive gradients
- Glassmorphism
- Floating blobs
- Animated illustrations
- Animated icons
- Cartoon imagery
- Excessive decorative effects

Use high-quality REAL agricultural photography.

Prefer authentic Ghanaian/West African agricultural context where appropriate.

Brand:

Cropo

Positioning:

Buy Fresh. Sell Faster. Waste Less.

Landing page:

- Hero
- Marketplace preview
- How it works
- For Farmers
- For Buyers
- Trust/verification explanation
- Final CTA

Primary CTA:

Explore Marketplace

Secondary CTA:

Sell on Cropo

Marketplace filters:

- Crop
- Location
- Price
- Quantity
- Grade
- Verified farmer
- Delivery availability

Crop details should show:

- Produce image
- Crop
- Price
- Quantity
- Grade
- Harvest date
- Location
- Farmer
- Farm
- Verification
- Description

Actions:

Buy Now
Make Offer

Use realistic demo data only where necessary.

Never invent:

- Traction
- Partnerships
- Customer testimonials
- Business statistics

Make the public site production-quality and mobile-first.

Do not implement real payments yet.
```

---

## PHASE 4 — Farmer Experience

```text
Build the complete Farmer experience using real Supabase data.

Routes:

/dashboard/farmer
/dashboard/farmer/listings
/dashboard/farmer/listings/new
/dashboard/farmer/offers
/dashboard/farmer/orders
/dashboard/farmer/earnings
/dashboard/farmer/profile
/dashboard/farmer/verification

Implement:

- Farmer dashboard
- Create listings
- Edit listings
- Pause listings
- Delete listings
- Photo uploads
- Incoming offers
- Accept/reject offers
- Orders
- Earnings
- Profile
- Verification workflow

Listing fields:

- Crop
- Category
- Variety
- Quantity
- Unit
- Price
- Grade
- Harvest date
- Available date
- Location
- Description
- Photos
- Delivery availability

The listing form must be exceptionally usable on mobile.

Use clear labels and validation.

Do not claim a farmer is verified until an admin actually verifies them.

Do not implement real payment processing.

Use the established Cropo design system.

Keep the interface practical, professional, restrained, and free of unnecessary animation.
```

---

## PHASE 5 — Buyer Experience

```text
Build the complete Buyer experience using real Supabase data.

Routes:

/dashboard/buyer
/dashboard/buyer/marketplace
/dashboard/buyer/requests
/dashboard/buyer/requests/new
/dashboard/buyer/offers
/dashboard/buyer/orders
/dashboard/buyer/suppliers
/dashboard/buyer/profile

Implement:

- Buyer dashboard
- Marketplace search
- Marketplace filtering
- Crop details
- Buy Now
- Make an Offer
- Buyer Request
- Offer management
- Order management
- Saved suppliers
- Buyer profile

Buyer Request fields:

- Crop
- Quantity
- Unit
- Desired grade
- Destination
- Required date
- Target price
- Description

Use professional marketplace UI.

Prefer clear tables and practical information layouts where appropriate instead of decorative cards.

Do not implement real payment processing yet.

Do not fabricate reviews, statistics, partnerships, or testimonials.
```

---

## PHASE 6 — Marketplace Transaction Engine

```text
Connect the Farmer and Buyer experiences into the real Cropo transaction engine.

Everything must use real Supabase data.

FLOW 1 — BUY NOW

Listing
→ Buy Now
→ Select quantity
→ Confirm
→ Create order

FLOW 2 — MAKE OFFER

Listing
→ Make Offer
→ Quantity
→ Proposed price
→ Message
→ Submit offer
→ Farmer accepts/rejects
→ Order if accepted

FLOW 3 — BUYER REQUEST

Buyer request
→ Farmer offers
→ Buyer selects offer
→ Order

Implement the controlled order state machine:

PENDING
ACCEPTED
CONFIRMED
PREPARING
READY_FOR_PICKUP
IN_TRANSIT
DELIVERED
COMPLETED
CANCELLED
DISPUTED
REJECTED

Prevent invalid state transitions server-side.

Implement database-backed notifications for:

- New offer
- Offer accepted
- Offer rejected
- New order
- Order accepted
- Order status changed
- New buying request
- Farmer response

Audit authorization carefully.

Users must not be able to manipulate another user's records by changing IDs.

Test the complete transaction loop end-to-end.

Do not add payment processing or logistics tracking yet.
```

---

## PHASE 7 — Admin

```text
Build the Cropo Admin system.

Routes:

/dashboard/admin
/dashboard/admin/farmers
/dashboard/admin/buyers
/dashboard/admin/listings
/dashboard/admin/orders
/dashboard/admin/disputes
/dashboard/admin/analytics

Use real database data.

Implement:

- Farmer management
- Buyer management
- Verification review
- Listing moderation
- Order monitoring
- Dispute management
- Useful analytics

Do not fabricate statistics.

Empty databases should show useful empty states rather than fake numbers.

Protect every admin operation server-side and through appropriate RLS.

The admin interface should look like serious business software.

Use:

- Tables
- Filters
- Status badges
- Compact useful metrics
- Clear actions

Avoid:

- Decorative charts
- Excessive colors
- Animation
- Decorative illustrations
```

---

## PHASE 8 — Production Audit

```text
Audit the complete Cropo application as a senior production engineer and product designer.

Do not add unnecessary features.

Check:

- UI consistency
- Responsive behavior
- Mobile usability
- Authentication
- Authorization
- RLS
- IDOR/security issues
- Input validation
- File uploads
- Database queries
- Performance
- Image optimization
- Accessibility
- SEO
- Metadata
- Loading states
- Empty states
- Error states
- Vercel deployment readiness

Remove anything that makes Cropo look obviously AI-generated:

- Excessive gradients
- Glassmorphism
- Unnecessary animations
- Animated icons
- Fake statistics
- Fake testimonials
- Fake partnerships
- Decorative UI effects
- Placeholder-looking copy

Use realistic professional agricultural imagery.

Run:

- TypeScript checks
- Lint
- Production build

Fix all errors.

Do not redesign working functionality unnecessarily.

Do not introduce new features unless needed to fix a problem.

At the end provide:

1. What was audited
2. What was fixed
3. Remaining deployment configuration
4. Known limitations
5. Confirmation that the production build succeeds
```

---

# 15. Persistent Agent Quality Rule

Keep this instruction available to the agent throughout the project:

```text
Before making any changes, inspect the existing implementation and reuse what already works.

Do not rewrite working features unnecessarily.

Do not introduce a new library when the current stack can solve the problem.

Do not create duplicate components.

Do not replace real functionality with mock data.

Do not remove existing functionality unless explicitly instructed.

Keep the application:

- Production-quality
- Maintainable
- Responsive
- Secure
- Accessible
- Visually consistent

When something is uncertain, choose the simplest production-appropriate implementation rather than adding unnecessary complexity.

Always preserve the Cropo design direction:

Professional.
Realistic.
Trustworthy.
Agricultural.
Modern.
African.

Do not allow the UI to drift into generic AI/SaaS aesthetics.
```

---

# 16. Recommended Execution Order

```text
1. Architecture
       ↓
2. Foundation
       ↓
3. Public Website
       ↓
4. Farmer Experience
       ↓
5. Buyer Experience
       ↓
6. Marketplace Transaction Engine
       ↓
7. Admin
       ↓
8. Production Audit
       ↓
9. Vercel Deployment
```

---

# 17. MVP Definition of Done

Cropo MVP is ready when:

- [ ] Farmer can create an account
- [ ] Farmer can create a profile
- [ ] Farmer can create a farm
- [ ] Farmer can create a produce listing
- [ ] Farmer can upload listing photos
- [ ] Farmer can manage listings
- [ ] Buyer can create an account
- [ ] Buyer can browse marketplace
- [ ] Buyer can search/filter listings
- [ ] Buyer can view farmer/listing details
- [ ] Buyer can make an offer
- [ ] Buyer can create a buying request
- [ ] Farmer can respond to offers/requests
- [ ] Accepted transactions create orders
- [ ] Orders follow controlled status transitions
- [ ] Farmer can see relevant orders
- [ ] Buyer can see relevant orders
- [ ] Admin can verify users
- [ ] Admin can moderate listings
- [ ] Admin can monitor orders
- [ ] Authentication is secure
- [ ] Authorization is secure
- [ ] RLS protects private data
- [ ] Mobile experience is strong
- [ ] Public pages are SEO-ready
- [ ] UI uses realistic professional photography
- [ ] Icons are static and professional
- [ ] No fake statistics/testimonials/partnerships
- [ ] No obvious AI-generated visual styling
- [ ] Production build succeeds
- [ ] Project is ready for Vercel
