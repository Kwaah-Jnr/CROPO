import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  getMarketplaceListings,
  type MarketplaceFilterParams,
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

async function runPass7Verification() {
  console.log("\n=======================================================");
  console.log(" CROPO PASS 7 — MARKETPLACE FILTER COMPLETENESS (M4)");
  console.log("=======================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // =========================================================================
  // 1. Baseline: unfiltered marketplace query
  // =========================================================================
  console.log("[1] Baseline Marketplace Query...");
  const allListings = await getMarketplaceListings({});
  assert(Array.isArray(allListings), "getMarketplaceListings({}) returns array");
  console.log(`    → ${allListings.length} active listing(s) found`);

  // =========================================================================
  // 2. Existing filters still work (regression)
  // =========================================================================
  console.log("\n[2] Existing Filter Regression...");

  // Region filter
  const regionFiltered = await getMarketplaceListings({ region: "Greater Accra" });
  assert(Array.isArray(regionFiltered), "Region filter returns an array");
  const allRegionMatch = regionFiltered.every(
    (l) => l.region.toLowerCase() === "greater accra"
  );
  assert(
    regionFiltered.length === 0 || allRegionMatch,
    "Region filter: all results match the requested region"
  );

  // Grade filter
  const gradeFiltered = await getMarketplaceListings({ grade: "A" });
  assert(Array.isArray(gradeFiltered), "Grade filter returns an array");
  const allGradeMatch = gradeFiltered.every((l) => l.grade === "A");
  assert(
    gradeFiltered.length === 0 || allGradeMatch,
    "Grade filter: all results are Grade A"
  );

  // Delivery filter
  const deliveryFiltered = await getMarketplaceListings({ delivery: "true" });
  assert(Array.isArray(deliveryFiltered), "Delivery filter returns an array");
  const allDeliveryMatch = deliveryFiltered.every((l) => l.delivery_available === true);
  assert(
    deliveryFiltered.length === 0 || allDeliveryMatch,
    "Delivery filter: all results have delivery_available=true"
  );

  // Category filter
  const catFiltered = await getMarketplaceListings({ category: "vegetables" });
  assert(Array.isArray(catFiltered), "Category filter returns an array");
  const allCatMatch = catFiltered.every(
    (l) => l.category_slug.toLowerCase() === "vegetables"
  );
  assert(
    catFiltered.length === 0 || allCatMatch,
    "Category filter: all results match category slug"
  );

  // Text search
  const searchFiltered = await getMarketplaceListings({ q: "zzzzz_no_match" });
  assert(Array.isArray(searchFiltered), "Text search returns an array");
  assert(searchFiltered.length === 0, "Nonsense search query returns 0 results");

  // Price filter
  const priceFiltered = await getMarketplaceListings({ minPrice: "9999999" });
  assert(Array.isArray(priceFiltered), "Min price filter returns an array");
  assert(priceFiltered.length === 0, "Unreachably high min price returns 0 results");

  // =========================================================================
  // 3. NEW: Quantity Filter (minQuantity)
  // =========================================================================
  console.log("\n[3] Quantity Filter (minQuantity)...");

  // No minQuantity → all results
  const noQtyFilter = await getMarketplaceListings({});
  assert(Array.isArray(noQtyFilter), "No quantity filter returns array");

  // minQuantity = 0 → should not filter anything (treated as non-positive)
  const zeroQty = await getMarketplaceListings({ minQuantity: "0" });
  assert(Array.isArray(zeroQty), "minQuantity=0 returns array");
  assert(
    zeroQty.length === noQtyFilter.length,
    `minQuantity=0 does not filter (${zeroQty.length} == ${noQtyFilter.length})`
  );

  // minQuantity = 1 → filters DB-side (quantity_available >= 1)
  const qty1 = await getMarketplaceListings({ minQuantity: "1" });
  assert(Array.isArray(qty1), "minQuantity=1 returns array");
  const allAbove1 = qty1.every((l) => l.quantity_available >= 1);
  assert(allAbove1, "minQuantity=1: all results have quantity_available >= 1");

  // Very high quantity → likely 0 results
  const highQty = await getMarketplaceListings({ minQuantity: "99999999" });
  assert(Array.isArray(highQty), "Very high minQuantity returns array");
  assert(highQty.length === 0, "minQuantity=99999999 returns 0 results");

  // Non-numeric minQuantity is safely ignored
  const badQty = await getMarketplaceListings({ minQuantity: "abc" });
  assert(Array.isArray(badQty), "Non-numeric minQuantity returns array");
  assert(
    badQty.length === noQtyFilter.length,
    `Non-numeric minQuantity is ignored (${badQty.length} == ${noQtyFilter.length})`
  );

  // Negative minQuantity is safely ignored
  const negQty = await getMarketplaceListings({ minQuantity: "-5" });
  assert(Array.isArray(negQty), "Negative minQuantity returns array");
  assert(
    negQty.length === noQtyFilter.length,
    `Negative minQuantity is ignored (${negQty.length} == ${noQtyFilter.length})`
  );

  // Moderate quantity threshold actually filters
  if (noQtyFilter.length > 0) {
    // Find a moderate quantity that should exclude at least some listings if variety exists
    const quantities = noQtyFilter.map((l) => l.quantity_available).sort((a, b) => a - b);
    const medianQty = quantities[Math.floor(quantities.length / 2)];
    const filteredByMedian = await getMarketplaceListings({ minQuantity: String(medianQty) });
    const allAboveMedian = filteredByMedian.every((l) => l.quantity_available >= medianQty);
    assert(allAboveMedian, `minQuantity=${medianQty}: all results have quantity >= ${medianQty}`);
    console.log(`    → Median quantity=${medianQty}: ${filteredByMedian.length}/${noQtyFilter.length} listings pass`);
  }

  // =========================================================================
  // 4. NEW: Verified Farmer Filter
  // =========================================================================
  console.log("\n[4] Verified Farmer Filter...");

  // verified=true → only VERIFIED farmers
  const verifiedOnly = await getMarketplaceListings({ verified: "true" });
  assert(Array.isArray(verifiedOnly), "verified=true returns array");
  const allVerified = verifiedOnly.every(
    (l) => l.farmer.verification_status === "VERIFIED"
  );
  assert(
    verifiedOnly.length === 0 || allVerified,
    "verified=true: all returned listings have VERIFIED farmer"
  );
  console.log(`    → ${verifiedOnly.length} listing(s) from verified farmers`);

  // No verified filter → returns all (verified + unverified)
  const noVerifiedFilter = await getMarketplaceListings({});
  assert(
    noVerifiedFilter.length >= verifiedOnly.length,
    `Without verified filter (${noVerifiedFilter.length}) >= with filter (${verifiedOnly.length})`
  );

  // verified=false/missing → no filtering applied
  const verifiedFalse = await getMarketplaceListings({ verified: "false" });
  assert(Array.isArray(verifiedFalse), "verified=false returns array");
  assert(
    verifiedFalse.length === noVerifiedFilter.length,
    `verified=false does not filter (${verifiedFalse.length} == ${noVerifiedFilter.length})`
  );

  // Verify that verification_status reflects actual DB state (not fabricated)
  if (verifiedOnly.length > 0) {
    const sampleFarmer = verifiedOnly[0].farmer;
    const { data: dbFarmer, error: dbError } = await anonClient
      .from("public_farmer_profiles")
      .select("id, verification_status")
      .eq("id", sampleFarmer.id)
      .maybeSingle();
    assert(!dbError, "Can query public_farmer_profiles for verification check", dbError?.message);
    assert(
      dbFarmer?.verification_status === "VERIFIED",
      `DB confirms farmer ${sampleFarmer.id.slice(0, 8)}… is actually VERIFIED`
    );
  }

  // =========================================================================
  // 5. Combined filters (new + existing)
  // =========================================================================
  console.log("\n[5] Combined Filter Tests...");

  // Quantity + Grade
  const qtyGrade = await getMarketplaceListings({ minQuantity: "1", grade: "A" });
  assert(Array.isArray(qtyGrade), "minQuantity + grade combined returns array");
  const qtyGradeValid = qtyGrade.every(
    (l) => l.quantity_available >= 1 && l.grade === "A"
  );
  assert(
    qtyGrade.length === 0 || qtyGradeValid,
    "Combined quantity+grade: all results satisfy both constraints"
  );

  // Verified + Region
  const verifiedRegion = await getMarketplaceListings({ verified: "true", region: "Ashanti" });
  assert(Array.isArray(verifiedRegion), "verified + region combined returns array");
  const verifiedRegionValid = verifiedRegion.every(
    (l) => l.farmer.verification_status === "VERIFIED" && l.region.toLowerCase() === "ashanti"
  );
  assert(
    verifiedRegion.length === 0 || verifiedRegionValid,
    "Combined verified+region: all results satisfy both constraints"
  );

  // Quantity + Verified + Category
  const tripleFilter = await getMarketplaceListings({
    minQuantity: "1",
    verified: "true",
    category: "vegetables",
  });
  assert(Array.isArray(tripleFilter), "Triple filter returns array");
  const tripleValid = tripleFilter.every(
    (l) =>
      l.quantity_available >= 1 &&
      l.farmer.verification_status === "VERIFIED" &&
      l.category_slug === "vegetables"
  );
  assert(
    tripleFilter.length === 0 || tripleValid,
    "Triple filter (qty+verified+category): all results satisfy all constraints"
  );

  // =========================================================================
  // 6. URL/Search Parameter Shareability
  // =========================================================================
  console.log("\n[6] URL Parameter Shareability...");

  // Verify the filter params type includes all expected keys
  const testParams: MarketplaceFilterParams = {
    q: "maize",
    category: "grains-cereals",
    region: "Ashanti",
    grade: "A",
    minPrice: "10",
    maxPrice: "500",
    delivery: "true",
    minQuantity: "50",
    verified: "true",
  };
  assert(
    typeof testParams.minQuantity === "string",
    "MarketplaceFilterParams type includes minQuantity"
  );
  assert(
    typeof testParams.verified === "string",
    "MarketplaceFilterParams type includes verified"
  );

  // All filter keys are serializable as URL search params
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(testParams)) {
    if (value) urlParams.set(key, value);
  }
  assert(urlParams.get("minQuantity") === "50", "minQuantity survives URL serialization");
  assert(urlParams.get("verified") === "true", "verified survives URL serialization");

  // =========================================================================
  // 7. Privacy: Verified status from public view only
  // =========================================================================
  console.log("\n[7] Verified Status Privacy...");

  // Anon should be able to query public_farmer_profiles (which has verification_status)
  const { data: publicFarmers, error: pubErr } = await anonClient
    .from("public_farmer_profiles")
    .select("id, verification_status")
    .limit(5);
  assert(!pubErr, "Anon can read public_farmer_profiles", pubErr?.message);
  assert(Array.isArray(publicFarmers), "public_farmer_profiles returns array");

  // Anon should NOT be able to read farmer_profiles directly
  const { data: privateFarmers, error: _privErr } = await anonClient
    .from("farmer_profiles")
    .select("profile_id, verification_status")
    .limit(1);
  assert(
    !privateFarmers || privateFarmers.length === 0,
    "Anon cannot read farmer_profiles directly (RLS blocks)"
  );

  // Verify verified status is only VERIFIED, PENDING, or UNVERIFIED (valid enum values)
  if (publicFarmers && publicFarmers.length > 0) {
    const validStatuses = ["VERIFIED", "PENDING", "UNVERIFIED"];
    const allValid = publicFarmers.every(
      (f: { verification_status: string }) => validStatuses.includes(f.verification_status)
    );
    assert(allValid, "All public verification_status values are valid enum values");
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n=======================================================");
  console.log(` PASS 7 RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass7Verification().catch((err) => {
  console.error("Verification suite crashed:", err);
  process.exit(1);
});
