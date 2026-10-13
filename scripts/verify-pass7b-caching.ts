import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import {
  getMarketplaceListings,
  getFeaturedListings,
  getMarketplaceListingById,
} from "../src/lib/data/marketplace";
import { createPublicClient } from "../src/lib/supabase/public";
import { createClient } from "@supabase/supabase-js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runPass7BVerification() {
  console.log("==========================================================================");
  console.log(" CROPO PASS 7B: PUBLIC PAGE CACHING AND RENDERING PERFORMANCE VERIFICATION");
  console.log("==========================================================================\n");

  // -------------------------------------------------------------------------
  // Suite 1: Route Segment Configurations & Prerender Manifest Guarantees
  // -------------------------------------------------------------------------
  console.log("[Suite 1] Static & ISR Route Configuration Analysis...");

  const aboutSrc = fs.readFileSync(path.join(process.cwd(), "src/app/about/page.tsx"), "utf8");
  assert(
    aboutSrc.includes('export const dynamic = "force-static"') || aboutSrc.includes("dynamic = 'force-static'"),
    "/about specifies force-static rendering"
  );

  const howItWorksSrc = fs.readFileSync(path.join(process.cwd(), "src/app/how-it-works/page.tsx"), "utf8");
  assert(
    howItWorksSrc.includes('export const dynamic = "force-static"') || howItWorksSrc.includes("dynamic = 'force-static'"),
    "/how-it-works specifies force-static rendering"
  );

  const homeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf8");
  assert(
    homeSrc.includes("export const revalidate = 60"),
    "/ (Homepage) specifies 60-second Incremental Static Regeneration (ISR)"
  );
  assert(
    !homeSrc.includes('dynamic = "force-dynamic"') && !homeSrc.includes("revalidate = 0"),
    "/ (Homepage) does not force dynamic rendering with revalidate=0"
  );

  const marketplaceSrc = fs.readFileSync(path.join(process.cwd(), "src/app/marketplace/page.tsx"), "utf8");
  assert(
    marketplaceSrc.includes('export const dynamic = "force-dynamic"'),
    "/marketplace forces dynamic rendering on-demand to preserve searchParams"
  );

  const listingDetailSrc = fs.readFileSync(path.join(process.cwd(), "src/app/marketplace/[id]/page.tsx"), "utf8");
  assert(
    listingDetailSrc.includes("export const revalidate = 30"),
    "/marketplace/[id] configures 30-second revalidation for produce detail"
  );
  assert(
    !listingDetailSrc.includes('dynamic = "force-dynamic"'),
    "/marketplace/[id] allows data caching via auto-evaluation rather than force-dynamic"
  );

  // Check production build prerender-manifest.json if available
  const prerenderPath = path.join(process.cwd(), ".next/prerender-manifest.json");
  if (fs.existsSync(prerenderPath)) {
    const manifest = JSON.parse(fs.readFileSync(prerenderPath, "utf8"));
    const routes = manifest.routes || {};

    assert(
      routes["/"] && routes["/"].initialRevalidateSeconds === 60,
      "Build manifest confirms / is an ISR route with initialRevalidateSeconds = 60"
    );
    assert(
      routes["/about"] && routes["/about"].initialRevalidateSeconds === false,
      "Build manifest confirms /about is purely static (initialRevalidateSeconds = false)"
    );
    assert(
      routes["/how-it-works"] && routes["/how-it-works"].initialRevalidateSeconds === false,
      "Build manifest confirms /how-it-works is purely static (initialRevalidateSeconds = false)"
    );
  } else {
    console.log("  ℹ .next/prerender-manifest.json not found, skipping manifest checks");
  }

  // -------------------------------------------------------------------------
  // Suite 2: Search, Filter, and Pagination Preservation on /marketplace
  // -------------------------------------------------------------------------
  console.log("\n[Suite 2] Query Parameter Preservation & Anti-Cache Collision Checks...");

  const page1 = await getMarketplaceListings({ page: 1, pageSize: 6 });
  const page2 = await getMarketplaceListings({ page: 2, pageSize: 6 });
  const cassavaQuery = await getMarketplaceListings({ q: "cassava", pageSize: 6 });
  const maizeQuery = await getMarketplaceListings({ q: "maize", pageSize: 6 });
  const vegQuery = await getMarketplaceListings({ category: "vegetables", pageSize: 6 });

  assert(page1.page === 1 && page1.listings.length > 0, "Page 1 returns valid first slice");
  assert(page2.page === 2 && page2.listings.length > 0, "Page 2 returns valid second slice");
  assert(
    page1.listings[0]?.id !== page2.listings[0]?.id,
    "Page 1 and Page 2 return different produce records (no shared key collision)"
  );

  assert(cassavaQuery.listings.length > 0, "Search query 'cassava' returns records");
  assert(
    cassavaQuery.listings.every((l) => l.crop_name.toLowerCase().includes("cassava")),
    "Search 'cassava' only contains matching crops"
  );

  assert(maizeQuery.listings.length > 0, "Search query 'maize' returns records");
  assert(
    maizeQuery.listings.every((l) => l.crop_name.toLowerCase().includes("maize")),
    "Search 'maize' only contains matching crops"
  );

  assert(
    cassavaQuery.listings[0]?.id !== maizeQuery.listings[0]?.id,
    "Search queries ('cassava' vs 'maize') return distinct results without cache collision"
  );

  assert(vegQuery.listings.length > 0, "Category filter 'vegetables' returns produce");
  assert(
    vegQuery.listings.every((l) => l.category_slug === "vegetables"),
    "Category filter returns only 'vegetables' produce"
  );

  // -------------------------------------------------------------------------
  // Suite 3: Listing Detail Projection, Status Freshness & Removed Handling
  // -------------------------------------------------------------------------
  console.log("\n[Suite 3] Listing Detail Projection & Status Freshness...");

  const featured = await getFeaturedListings(4);
  assert(featured.length <= 4, "getFeaturedListings returns at most requested limit");
  assert(featured.every((l) => l.status === "ACTIVE"), "All featured listings are ACTIVE");

  const activeListingId = page1.listings[0].id;
  const listing = await getMarketplaceListingById(activeListingId);

  assert(listing !== null, "getMarketplaceListingById returns active listing");
  assert(listing?.id === activeListingId, "Returned listing ID matches requested ID");
  assert(typeof listing?.crop_name === "string" && listing.crop_name.length > 0, "crop_name is populated");
  assert(typeof listing?.price_per_unit === "number" && listing.price_per_unit > 0, "price_per_unit is valid number");
  assert(typeof listing?.quantity_available === "number" && listing.quantity_available > 0, "quantity_available is valid number");
  assert(typeof listing?.farmer.full_name === "string" && listing.farmer.full_name.length > 0, "farmer full_name is populated");
  assert(listing?.status === "ACTIVE", "Only ACTIVE listings are returned to public");

  const nonExistent = await getMarketplaceListingById("00000000-0000-0000-0000-000000000000");
  assert(nonExistent === null, "Non-existent UUID safely returns null");

  const invalidUuid = await getMarketplaceListingById("invalid-id-format");
  assert(invalidUuid === null, "Malformed ID safely returns null without query error");

  // -------------------------------------------------------------------------
  // Suite 4: Transaction Operations Database Authority (Row-Locking RPCs)
  // -------------------------------------------------------------------------
  console.log("\n[Suite 4] Transaction Safety: Database Authority (Row Locking)...");

  // 1. Anonymous caller: RPC strictly rejects transaction execution
  const anonClient = createPublicClient();
  const { data: anonOrderData, error: anonOrderErr } = await anonClient.rpc("create_buy_now_order", {
    p_listing_id: activeListingId,
    p_quantity: 1,
    p_delivery_method: "PICKUP",
  });

  console.log("  ℹ anonOrderErr returned:", anonOrderErr?.message);
  assert(
    anonOrderData === null && anonOrderErr !== null,
    "Database RPC strictly blocks unauthenticated transaction attempts (cached data cannot authorize orders)"
  );

  // 2. Authenticated Buyer: Test DB row-lock enforcement of stock and delivery constraints
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const testBuyerEmail = `pass7b_buyer_${Date.now()}@cropo.test`;
  const testBuyerPassword = "Pass7bPassword123!";

  const baseClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: signUpData, error: signUpErr } = await baseClient.auth.signUp({
    email: testBuyerEmail,
    password: testBuyerPassword,
    options: { data: { role: "BUYER", full_name: "Test Pass7B Buyer" } },
  });

  if (signUpErr || !signUpData.session) {
    console.error("  ℹ Could not create test buyer session:", signUpErr?.message);
  } else {
    const buyerClient = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${signUpData.session.access_token}` } },
    });

    // Test over-stock purchase attempt via authenticated buyer
    const { data: overOrderData, error: overOrderErr } = await buyerClient.rpc("create_buy_now_order", {
      p_listing_id: activeListingId,
      p_quantity: 999999, // Intentional over-order exceeding stock
      p_delivery_method: "PICKUP",
    });

    assert(overOrderData === null, "Over-order quantity returns null order result from authenticated RPC");
    assert(
      overOrderErr !== null &&
        (overOrderErr.message.includes("Requested quantity exceeds") ||
          overOrderErr.message.includes("exceeds available") ||
          overOrderErr.message.includes("insufficient stock")),
      "Database RPC row lock enforces stock limits at commit time (public caching cannot bypass stock validation)"
    );

    // Test delivery validation on pickup-only listing if available
    const pickupOnlyListing = (await getMarketplaceListings({ pageSize: 50 })).listings.find(
      (l) => !l.delivery_available
    );

    if (pickupOnlyListing) {
      const { data: delData, error: delErr } = await buyerClient.rpc("create_buy_now_order", {
        p_listing_id: pickupOnlyListing.id,
        p_quantity: 1,
        p_delivery_method: "DELIVERY",
        p_delivery_address: "123 Farm Road, Accra",
      });

      assert(delData === null, "Delivery order on pickup-only listing returns null order result");
      assert(
        delErr !== null && delErr.message.toLowerCase().includes("delivery"),
        "Database RPC strictly enforces delivery constraints regardless of public page cache"
      );
    }
  }

  // -------------------------------------------------------------------------
  // Suite 5: Cache Invalidation Wiring Verification
  // -------------------------------------------------------------------------
  console.log("\n[Suite 5] Cache Invalidation & Tag Revalidation Wiring...");

  const farmerActionsSrc = fs.readFileSync(path.join(process.cwd(), "src/actions/farmer.ts"), "utf8");
  assert(
    farmerActionsSrc.includes('import { revalidatePath, revalidateTag } from "next/cache"'),
    "farmer.ts imports revalidateTag from next/cache"
  );
  assert(
    farmerActionsSrc.includes('revalidateTag(`listing-${listingId}`, "max")') ||
      farmerActionsSrc.includes('revalidateTag("listing-" + listingId, "max")'),
    "updateListing and removeListing invalidate listing-${listingId} tag"
  );
  assert(
    farmerActionsSrc.includes('revalidateTag("featured-listings", "max")'),
    "farmer mutations invalidate featured-listings tag"
  );
  assert(
    farmerActionsSrc.includes('revalidateTag("marketplace-listings", "max")'),
    "farmer mutations invalidate marketplace-listings tag"
  );
  assert(
    farmerActionsSrc.includes('revalidatePath("/")'),
    "farmer actions revalidate homepage path /"
  );

  const buyerActionsSrc = fs.readFileSync(path.join(process.cwd(), "src/actions/buyer.ts"), "utf8");
  assert(
    buyerActionsSrc.includes('import { revalidatePath, revalidateTag } from "next/cache"'),
    "buyer.ts imports revalidateTag from next/cache"
  );
  assert(
    buyerActionsSrc.includes('revalidateTag(`listing-${parsed.data.listing_id}`, "max")') ||
      buyerActionsSrc.includes('revalidateTag("listing-" + parsed.data.listing_id, "max")'),
    "createBuyNowOrder invalidates the specific listing tag"
  );
  assert(
    buyerActionsSrc.includes('revalidateTag("featured-listings", "max")'),
    "createBuyNowOrder invalidates featured-listings tag"
  );
  assert(
    buyerActionsSrc.includes('revalidatePath("/")'),
    "createBuyNowOrder revalidates homepage path /"
  );

  console.log("\n==========================================================================");
  console.log(` PASS 7B CACHING VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==========================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass7BVerification().catch((err) => {
  console.error("Pass 7B verification script encountered unexpected error:", err);
  process.exit(1);
});
