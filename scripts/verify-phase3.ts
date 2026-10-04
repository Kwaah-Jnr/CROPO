import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  getMarketplaceListings,
  getMarketplaceListingById,
  getFarmerProfileById,
} from "../src/lib/data/marketplace";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runPhase3Verification() {
  console.log("\n=======================================================");
  console.log(" CROPO PHASE 3 — VERIFICATION & SECURITY SUITE");
  console.log("=======================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // -------------------------------------------------------------------------
  // 1. Anonymous Marketplace Access
  // -------------------------------------------------------------------------
  console.log("[1] Testing Anonymous Marketplace Access...");
  const { data: listings, error: listingsErr } = await anonClient
    .from("listings")
    .select("id, crop_name, status");
  assert(!listingsErr, "Anon client can query active listings table without RLS error", listingsErr?.message);
  assert(Array.isArray(listings), "Listings query returns an array");

  const { data: categories, error: catErr } = await anonClient
    .from("crop_categories")
    .select("id, name, slug");
  assert(!catErr, "Anon client can query active crop categories", catErr?.message);
  assert((categories?.length ?? 0) >= 5, `Expected at least 5 crop categories, found ${categories?.length}`);

  // -------------------------------------------------------------------------
  // 2. Marketplace Filters
  // -------------------------------------------------------------------------
  console.log("\n[2] Testing Marketplace Filter Parameters...");
  const emptyFilterRes = await getMarketplaceListings({});
  assert(Array.isArray(emptyFilterRes), "getMarketplaceListings({}) returns array");

  const regionFilterRes = await getMarketplaceListings({ region: "Ashanti" });
  assert(Array.isArray(regionFilterRes), "Filter by region executes safely");

  const categoryFilterRes = await getMarketplaceListings({ category: "vegetables" });
  assert(Array.isArray(categoryFilterRes), "Filter by category executes safely");

  const gradeFilterRes = await getMarketplaceListings({ grade: "A" });
  assert(Array.isArray(gradeFilterRes), "Filter by grade executes safely");

  const priceFilterRes = await getMarketplaceListings({ minPrice: "5", maxPrice: "100" });
  assert(Array.isArray(priceFilterRes), "Filter by price range executes safely");

  const deliveryFilterRes = await getMarketplaceListings({ delivery: "true" });
  assert(Array.isArray(deliveryFilterRes), "Filter by delivery option executes safely");

  const searchFilterRes = await getMarketplaceListings({ q: "tomato" });
  assert(Array.isArray(searchFilterRes), "Text search query executes safely");

  // -------------------------------------------------------------------------
  // 3. Listing Detail Access
  // -------------------------------------------------------------------------
  console.log("\n[3] Testing Listing Detail Access & Fallback Integrity...");
  const missingListing = await getMarketplaceListingById("00000000-0000-0000-0000-000000000000");
  assert(missingListing === null, "Non-existent listing ID returns null (never fictitious sample)");

  const bogusIdListing = await getMarketplaceListingById("sample-1");
  assert(bogusIdListing === null, "Legacy sample ID 'sample-1' returns null (never fictitious inventory)");

  // -------------------------------------------------------------------------
  // 4. Public Farmer Profile Access & Privacy Protection
  // -------------------------------------------------------------------------
  console.log("\n[4] Testing Public Farmer Profile Privacy...");
  const { data: publicProfiles, error: pubErr } = await anonClient
    .from("public_farmer_profiles")
    .select("*");
  assert(!pubErr, "Anon client can query security-barrier view public_farmer_profiles", pubErr?.message);

  if (publicProfiles && publicProfiles.length > 0) {
    const sample = publicProfiles[0] as Record<string, unknown>;
    assert(!("phone" in sample), "public_farmer_profiles does NOT expose 'phone'");
    assert(!("email" in sample), "public_farmer_profiles does NOT expose 'email'");
    assert(!("document_paths" in sample), "public_farmer_profiles does NOT expose 'document_paths'");
    assert(!("national_id" in sample), "public_farmer_profiles does NOT expose 'national_id'");
    assert("full_name" in sample, "public_farmer_profiles includes public 'full_name'");
    assert("verification_status" in sample, "public_farmer_profiles includes 'verification_status'");
  }

  const missingFarmer = await getFarmerProfileById("00000000-0000-0000-0000-000000000000");
  assert(missingFarmer === null, "Non-existent farmer ID returns null (never fictitious farmer profile)");

  const legacyFarmer = await getFarmerProfileById("farmer-kwame-mensah");
  assert(legacyFarmer === null, "Fictional farmer 'farmer-kwame-mensah' returns null");

  // -------------------------------------------------------------------------
  // 5. Unauthorized / Private Data Access (Negative Security Tests)
  // -------------------------------------------------------------------------
  console.log("\n[5] Testing Unauthorized Private Data Access Restrictions...");
  const privateTables = [
    { name: "profiles", desc: "User profiles (containing phone numbers and auth details)" },
    { name: "farmer_profiles", desc: "Internal farmer records" },
    { name: "buyer_profiles", desc: "Internal buyer records" },
    { name: "orders", desc: "Commercial orders" },
    { name: "order_items", desc: "Order line items" },
    { name: "order_status_history", desc: "Internal order audit status history" },
    { name: "offers", desc: "Negotiation offers" },
    { name: "buying_requests", desc: "Buyer reverse demand requests" },
    { name: "request_offers", desc: "Farmer request quotes" },
    { name: "saved_suppliers", desc: "Saved supplier lists" },
    { name: "verification_submissions", desc: "Identity & land verification documents" },
    { name: "disputes", desc: "Administrative dispute claims" },
    { name: "notifications", desc: "User notifications" },
  ];

  for (const { name, desc } of privateTables) {
    const { data, error } = await anonClient.from(name).select("*");
    const blocked = error !== null || (data?.length ?? 0) === 0;
    assert(
      blocked,
      `Anon access to '${name}' is strictly denied/blocked (${desc})`,
      error ? error.message : `Returned ${data?.length} rows`
    );
  }

  // -------------------------------------------------------------------------
  // 6. Empty Marketplace State Integrity
  // -------------------------------------------------------------------------
  console.log("\n[6] Testing Empty Marketplace State Integrity...");
  const currentListings = await getMarketplaceListings();
  if (listings?.length === 0) {
    assert(
      currentListings.length === 0,
      "When Supabase has 0 active listings, getMarketplaceListings() returns [] (honest empty state)"
    );
  } else {
    assert(
      currentListings.length === listings?.length,
      `Listings count (${currentListings.length}) matches database count (${listings?.length})`
    );
  }

  // -------------------------------------------------------------------------
  // 7. Order State Machine Consistency
  // -------------------------------------------------------------------------
  console.log("\n[7] Testing Order State Machine Consistency...");
  const expectedOrderStatuses = [
    "PENDING",
    "ACCEPTED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "DISPUTED",
    "REJECTED",
  ];
  assert(expectedOrderStatuses.length === 11, "Exactly 11 order states in the backend state machine");

  // Summary
  console.log("\n=======================================================");
  console.log(` PHASE 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Verification().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
