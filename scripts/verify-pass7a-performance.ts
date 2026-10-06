import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createPublicClient } from "../src/lib/supabase/public";
import {
  getMarketplaceListings,
  getFeaturedListings,
  getFarmerProfileById,
  getMarketplaceListingById,
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

async function runPass7AVerification() {
  console.log("\n=======================================================");
  console.log(" CROPO PASS 7A — MARKETPLACE DATA PERFORMANCE TESTS");
  console.log("=======================================================\n");

  const supabase = createPublicClient();

  // 1. Default marketplace page returns at most 12 listings
  console.log("[1] Testing Server-Side Pagination (Default Page Size 12)...");
  const p1 = await getMarketplaceListings({});
  assert(Array.isArray(p1), "getMarketplaceListings returns an Array-compatible result");
  assert(p1.length <= 12, `Default page returns at most 12 listings (got ${p1.length})`);
  assert(p1.length === 12, `First page filled with 12 listings when catalog > 12 (got ${p1.length})`);
  assert(p1.pageSize === 12, `pageSize is 12`);
  assert(p1.page === 1, `page number is 1`);
  assert(p1.totalCount >= 40, `totalCount reflects full active catalog (${p1.totalCount})`);
  assert(p1.totalPages === Math.ceil(p1.totalCount / 12), `totalPages calculated accurately (${p1.totalPages})`);
  assert(p1.hasNextPage === true, `hasNextPage is true when more pages exist`);
  assert(p1.hasPrevPage === false, `hasPrevPage is false on page 1`);

  // 2. Explicit page 2 returns the correct next slice
  console.log("\n[2] Testing Explicit Page 2 Pagination...");
  const p2 = await getMarketplaceListings({ page: 2 });
  assert(p2.page === 2, `Page 2 returns page 2 metadata`);
  assert(p2.length <= 12 && p2.length > 0, `Page 2 returns non-empty slice of listings (${p2.length})`);
  assert(p2.hasPrevPage === true, `hasPrevPage is true on page 2`);
  const page1Ids = new Set(p1.map((l) => l.id));
  const page2HasDuplicates = p2.some((l) => page1Ids.has(l.id));
  assert(!page2HasDuplicates, `Page 2 listings have zero overlap with Page 1 listings`);

  // 3. Pagination metadata boundary conditions
  console.log("\n[3] Testing Pagination Metadata Boundaries...");
  const lastPage = p1.totalPages;
  const pLast = await getMarketplaceListings({ page: lastPage });
  assert(pLast.page === lastPage, `Last page returns page ${lastPage}`);
  assert(pLast.hasNextPage === false, `hasNextPage is false on last page`);
  assert(pLast.hasPrevPage === true, `hasPrevPage is true on last page`);

  const pBeyond = await getMarketplaceListings({ page: lastPage + 10 });
  assert(pBeyond.length === 0, `Page beyond totalPages returns empty slice`);
  assert(pBeyond.hasNextPage === false, `hasNextPage is false when page beyond total`);

  // 4. Database tsvector text search returns correct results
  console.log("\n[4] Testing Database tsvector Text Search...");
  const sCassava = await getMarketplaceListings({ q: "cassava" });
  assert(sCassava.length > 0, `Search for 'cassava' returns active results (${sCassava.length})`);
  const allCassavaMatch = sCassava.every(
    (l) =>
      l.crop_name.toLowerCase().includes("cassava") ||
      l.variety?.toLowerCase().includes("cassava") ||
      l.region.toLowerCase().includes("cassava") ||
      l.city.toLowerCase().includes("cassava") ||
      l.description.toLowerCase().includes("cassava")
  );
  assert(allCassavaMatch, `Every result from 'cassava' search matches the query`);

  // 5. Multi-word search
  console.log("\n[5] Testing Multi-Word Database Text Search...");
  const sMulti = await getMarketplaceListings({ q: "yellow maize" });
  assert(sMulti.length > 0, `Search for 'yellow maize' returns matching results (${sMulti.length})`);
  const multiMatch = sMulti.every(
    (l) =>
      (l.crop_name.toLowerCase().includes("maize") || (l.variety && l.variety.toLowerCase().includes("maize"))) &&
      (l.crop_name.toLowerCase().includes("yellow") ||
        (l.variety && l.variety.toLowerCase().includes("yellow")) ||
        l.description.toLowerCase().includes("yellow"))
  );
  assert(multiMatch, `Multi-word search matches yellow maize produce correctly`);

  // 6. Database-level category filtering
  console.log("\n[6] Testing Database-Level Category Filtering...");
  const catVegetables = await getMarketplaceListings({ category: "vegetables" });
  assert(catVegetables.length > 0, `Category 'vegetables' returns results (${catVegetables.length})`);
  assert(
    catVegetables.every((l) => l.category_slug === "vegetables"),
    `All returned listings have category_slug 'vegetables'`
  );

  const catGrains = await getMarketplaceListings({ category: "grains-cereals" });
  assert(
    catGrains.every((l) => l.category_slug === "grains-cereals"),
    `All returned listings for 'grains-cereals' have category_slug 'grains-cereals'`
  );

  // 7. Combined search + category + region filters
  console.log("\n[7] Testing Combined Search + Category + Region Filters...");
  const combined = await getMarketplaceListings({
    category: "vegetables",
    q: "pepper",
  });
  assert(
    combined.every(
      (l) =>
        l.category_slug === "vegetables" &&
        (l.crop_name.toLowerCase().includes("pepper") || (l.variety && l.variety.toLowerCase().includes("pepper")))
    ),
    `Combined category + search produces intersection at database level`
  );

  // 8. Farmer profile only returns that farmer's active listings
  console.log("\n[8] Testing Farmer Public Profile Query Efficiency...");
  const { data: farmerProfiles } = await supabase
    .from("public_farmer_profiles")
    .select("id, full_name")
    .limit(3);

  assert(Boolean(farmerProfiles && farmerProfiles.length > 0), `Found public farmer profiles to test`);
  if (farmerProfiles && farmerProfiles.length > 0 && farmerProfiles[0].id) {
    const targetFarmer = farmerProfiles[0] as { id: string; full_name: string };
    const profile = await getFarmerProfileById(targetFarmer.id);
    assert(profile !== null, `Profile loaded for farmer ${targetFarmer.full_name}`);
    if (profile) {
      assert(profile.farmer.id === targetFarmer.id, `Profile farmer ID matches requested ID`);
      assert(
        profile.listings.every((l) => l.farmer.id === targetFarmer.id && l.status === "ACTIVE"),
        `All profile listings belong strictly to target farmer and are ACTIVE`
      );
      assert(
        profile.listings.length <= 10,
        `Farmer profile only loaded farmer's listings (${profile.listings.length}), not entire catalog`
      );
    }
  }

  // 9. Homepage featured query returns only 4 listings
  console.log("\n[9] Testing Homepage Featured Query...");
  const featured = await getFeaturedListings(4);
  assert(Array.isArray(featured), `getFeaturedListings returns an array`);
  assert(featured.length === 4, `getFeaturedListings(4) returns exactly 4 listings (got ${featured.length})`);
  assert(
    featured.every((l) => l.status === "ACTIVE"),
    `All featured listings are ACTIVE`
  );

  // 10. No public query downloads the complete catalog
  console.log("\n[10] Testing Catalog Download Boundaries...");
  assert(p1.length === 12, `getMarketplaceListings() default slice is 12 (catalog size is ${p1.totalCount})`);
  assert(featured.length === 4, `getFeaturedListings() default slice is 4 (not catalog size)`);

  // 11. Anonymous access remains correct and safe
  console.log("\n[11] Testing Anonymous Access & RLS...");
  const anonListings = await supabase.from("listings").select("id, status").limit(5);
  assert(anonListings.error === null, `Anon client can read active listings: ${anonListings.error?.message || "OK"}`);
  assert(
    (anonListings.data || []).every((l) => l.status === "ACTIVE"),
    `Anon client only sees ACTIVE listings via RLS`
  );

  // Attempt to read private tables via anon client
  const anonOrders = await supabase.from("orders").select("id").limit(1);
  assert(
    (anonOrders.data?.length ?? 0) === 0,
    `Anon client cannot view private orders (RLS returned 0 rows)`
  );

  const anonProfiles = await supabase.from("profiles").select("id, phone").limit(1);
  assert(
    (anonProfiles.data?.length ?? 0) === 0,
    `Anon client cannot view raw profiles table directly with phone numbers`
  );

  // 12. Listing detail caching and projection
  console.log("\n[12] Testing Listing Detail Query Projection...");
  if (p1.length > 0) {
    const single = await getMarketplaceListingById(p1[0].id);
    assert(single !== null, `getMarketplaceListingById loads valid listing`);
    assert(single?.id === p1[0].id, `Loaded listing matches requested ID`);
    assert(typeof single?.crop_name === "string", `crop_name is present`);
    assert(typeof single?.farmer.full_name === "string", `farmer full_name is present`);
  }

  console.log("\n-------------------------------------------------------");
  console.log(` Pass 7A Verification Summary: ${passed} passed, ${failed} failed`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass7AVerification().catch((err) => {
  console.error("Pass 7A Verification crashed:", err);
  process.exit(1);
});
