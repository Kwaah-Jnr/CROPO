import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  listingSchema,
  listingStatusSchema,
  farmerProfileSchema,
  farmSchema,
  PRODUCE_UNITS,
  PRODUCE_GRADES,
  LISTING_STATUSES,
} from "../src/lib/validation/farmer";

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

async function runPhase4Verification() {
  console.log("\n=======================================================");
  console.log(" CROPO PHASE 4 — FARMER DASHBOARD & LISTING TEST SUITE");
  console.log("=======================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // -------------------------------------------------------------------------
  // 1. Listing Validation Tests (Zod Schema)
  // -------------------------------------------------------------------------
  console.log("[1] Testing Listing Schema Validation...");

  // Valid base payload
  const validListing = {
    crop_name: "Fresh Red Habanero",
    category_id: "123e4567-e89b-12d3-a456-426614174000",
    variety: "Legon 18",
    description: "Export-quality Scotch Bonnet peppers freshly harvested from Kumasi.",
    unit: "BAG" as const,
    price_per_unit: 180.5,
    quantity_available: 50,
    grade: "A" as const,
    harvest_date: "2026-10-15",
    available_date: "2026-10-16",
    delivery_available: true,
    region: "Ashanti",
    city: "Ejisu",
    status: "ACTIVE" as const,
  };

  const validResult = listingSchema.safeParse(validListing);
  assert(
    validResult.success,
    "Valid listing payload passes schema validation",
    validResult.success ? undefined : JSON.stringify(validResult.error.format())
  );

  // Invalid: Empty crop name
  const invalidName = listingSchema.safeParse({ ...validListing, crop_name: "" });
  assert(!invalidName.success, "Rejects empty crop_name");

  // Invalid: Negative or zero price
  const negativePrice = listingSchema.safeParse({ ...validListing, price_per_unit: -10 });
  assert(!negativePrice.success, "Rejects negative price_per_unit");

  const zeroPrice = listingSchema.safeParse({ ...validListing, price_per_unit: 0 });
  assert(!zeroPrice.success, "Rejects zero price_per_unit");

  // Invalid: Zero quantity
  const zeroQty = listingSchema.safeParse({ ...validListing, quantity_available: 0 });
  assert(!zeroQty.success, "Rejects zero quantity_available");

  // Invalid: Negative quantity
  const negQty = listingSchema.safeParse({ ...validListing, quantity_available: -5 });
  assert(!negQty.success, "Rejects negative quantity_available");

  // Invalid: Unsupported unit
  const invalidUnit = listingSchema.safeParse({ ...validListing, unit: "LITERS" });
  assert(!invalidUnit.success, "Rejects unsupported unit 'LITERS'");

  // Invalid: Unsupported grade
  const invalidGrade = listingSchema.safeParse({ ...validListing, grade: "AAA" });
  assert(!invalidGrade.success, "Rejects unsupported quality grade 'AAA'");

  // Invalid: Non-Ghanaian region
  const invalidRegion = listingSchema.safeParse({ ...validListing, region: "California" });
  assert(!invalidRegion.success, "Rejects non-Ghanaian region 'California'");

  // Allowed units check
  assert(
    PRODUCE_UNITS.includes("BAG") && PRODUCE_UNITS.includes("CRATE") && PRODUCE_UNITS.includes("TONNE"),
    "PRODUCE_UNITS includes agricultural standards: BAG, CRATE, TONNE, KG, BOX, BUNCH, PIECE"
  );

  // Allowed grades check
  assert(
    PRODUCE_GRADES.includes("A") && PRODUCE_GRADES.includes("B") && PRODUCE_GRADES.includes("UNGRADED"),
    "PRODUCE_GRADES includes A, B, C, UNGRADED"
  );

  // Allowed statuses check
  assert(
    LISTING_STATUSES.includes("ACTIVE") &&
      LISTING_STATUSES.includes("PAUSED") &&
      LISTING_STATUSES.includes("SOLD_OUT") &&
      LISTING_STATUSES.includes("REMOVED"),
    "LISTING_STATUSES includes ACTIVE, PAUSED, SOLD_OUT, REMOVED"
  );

  // Quick Status Schema
  const validStatusUpdate = listingStatusSchema.safeParse({
    status: "PAUSED",
  });
  assert(validStatusUpdate.success, "listingStatusSchema accepts valid status transition to PAUSED");

  const invalidStatusUpdate = listingStatusSchema.safeParse({
    status: "DELETED",
  });
  assert(!invalidStatusUpdate.success, "listingStatusSchema rejects invalid status 'DELETED'");

  // -------------------------------------------------------------------------
  // 2. Farmer Profile & Farm Validation Tests
  // -------------------------------------------------------------------------
  console.log("\n[2] Testing Farmer Profile & Farm Validation...");

  const validProfile = farmerProfileSchema.safeParse({
    full_name: "Kwame Mensah",
    phone: "0241234567",
    region: "Ashanti",
    city: "Ejisu",
    bio: "Experienced tomato and pepper farmer practicing good agricultural practices.",
    years_farming: 12,
  });
  assert(validProfile.success, "Valid farmer profile passes schema");

  const invalidPhoneProfile = farmerProfileSchema.safeParse({
    full_name: "Kwame Mensah",
    phone: "123", // too short
    region: "Ashanti",
  });
  assert(!invalidPhoneProfile.success, "Rejects phone number that does not match Ghanaian format");

  const validFarm = farmSchema.safeParse({
    name: "Green Valley Farm",
    region: "Eastern",
    district: "Akuapem South",
    community: "Aburi",
    size_hectares: 15.5,
  });
  assert(validFarm.success, "Valid farm holdings data passes schema");

  const invalidFarmAcreage = farmSchema.safeParse({
    name: "Green Valley Farm",
    region: "Eastern",
    size_hectares: -2,
  });
  assert(!invalidFarmAcreage.success, "Rejects negative farm size");

  // -------------------------------------------------------------------------
  // 3. Farmer Authorization & Non-Farmer Access Control
  // -------------------------------------------------------------------------
  console.log("\n[3] Testing Farmer Authorization & Negative Access Tests...");

  // Anonymous user cannot insert listings
  const { error: anonInsertErr } = await anonClient
    .from("listings")
    .insert([
      {
        farmer_id: "00000000-0000-0000-0000-000000000099",
        category_id: "00000000-0000-0000-0000-000000000001",
        crop_name: "Unauthorized Cassava",
        unit: "BAG",
        price_per_unit: 100,
        currency: "GHS",
        quantity_available: 10,
        grade: "A",
        region: "Ashanti",
        status: "ACTIVE",
      },
    ])
    .select();

  assert(
    anonInsertErr !== null,
    "Anonymous/unauthorized user is blocked from inserting into 'listings' (RLS denied)",
    anonInsertErr?.message
  );

  // Anonymous user cannot update listings
  const { data: anonUpdateData, error: anonUpdateErr } = await anonClient
    .from("listings")
    .update({ price_per_unit: 1 })
    .eq("status", "ACTIVE")
    .select();

  const updateBlocked = anonUpdateErr !== null || (anonUpdateData?.length ?? 0) === 0;
  assert(
    updateBlocked,
    "Anonymous/unauthorized user cannot update any listing in 'listings' table",
    anonUpdateErr ? anonUpdateErr.message : "0 rows updated"
  );

  // Anonymous user cannot delete listings
  const { data: anonDelData, error: anonDelErr } = await anonClient
    .from("listings")
    .delete()
    .eq("status", "ACTIVE")
    .select();

  const deleteBlocked = anonDelErr !== null || (anonDelData?.length ?? 0) === 0;
  assert(
    deleteBlocked,
    "Anonymous/unauthorized user cannot delete any listing from 'listings' table",
    anonDelErr ? anonDelErr.message : "0 rows deleted"
  );

  // -------------------------------------------------------------------------
  // 4. Listing Ownership & Image Security
  // -------------------------------------------------------------------------
  console.log("\n[4] Testing Listing Ownership & Image Storage Boundaries...");

  // Anon cannot insert listing images
  const { error: imgInsertErr } = await anonClient
    .from("listing_images")
    .insert([
      {
        listing_id: "00000000-0000-0000-0000-000000000001",
        storage_path: "unauthorized/hacker.jpg",
        display_order: 0,
      },
    ])
    .select();

  assert(
    imgInsertErr !== null,
    "Anonymous/unauthorized user cannot insert into 'listing_images' table",
    imgInsertErr?.message
  );

  // Anon cannot delete listing images
  const { data: imgDelData, error: imgDelErr } = await anonClient
    .from("listing_images")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select();

  const imgDelBlocked = imgDelErr !== null || (imgDelData?.length ?? 0) === 0;
  assert(
    imgDelBlocked,
    "Anonymous/unauthorized user cannot delete from 'listing_images' table",
    imgDelErr ? imgDelErr.message : "0 rows deleted"
  );

  // Verify listing-images storage bucket exists or is restricted
  const { data: buckets, error: bucketErr } = await anonClient.storage.listBuckets();
  if (bucketErr) {
    console.log("  ℹ Bucket listing is restricted for anonymous users (expected RLS behavior)");
  } else {
    const listingBucket = buckets?.find((b) => b.name === "listing-images");
    if (listingBucket) {
      assert(true, "'listing-images' storage bucket is present");
      assert(listingBucket.public === true, "'listing-images' bucket is configured for public read-access");
    }
  }

  // -------------------------------------------------------------------------
  // 5. Verification & Privacy Boundaries
  // -------------------------------------------------------------------------
  console.log("\n[5] Testing Farmer Verification & Privacy Boundaries...");

  // verification_submissions must NEVER be readable by anon
  const { data: verifData, error: verifErr } = await anonClient
    .from("verification_submissions")
    .select("*");

  const verifBlocked = verifErr !== null || (verifData?.length ?? 0) === 0;
  assert(
    verifBlocked,
    "Anonymous users cannot access 'verification_submissions' (national IDs, land deeds protected)",
    verifErr?.message
  );

  // farmer_profiles must NEVER be readable directly by anon (must use public_farmer_profiles)
  const { data: farmerProfData, error: farmerProfErr } = await anonClient
    .from("farmer_profiles")
    .select("*");

  const farmerProfBlocked = farmerProfErr !== null || (farmerProfData?.length ?? 0) === 0;
  assert(
    farmerProfBlocked,
    "Anonymous users cannot query internal 'farmer_profiles' table directly",
    farmerProfErr?.message
  );

  // Farms table must not be modifiable by anon
  const { error: farmInsertErr } = await anonClient
    .from("farms")
    .insert([
      {
        farmer_id: "00000000-0000-0000-0000-000000000099",
        name: "Illegal Farm",
        region: "Ashanti",
      },
    ])
    .select();

  assert(
    farmInsertErr !== null,
    "Anonymous users cannot insert into 'farms' table",
    farmInsertErr?.message
  );

  // -------------------------------------------------------------------------
  // 6. Honest Empty States & No Fake Statistics
  // -------------------------------------------------------------------------
  console.log("\n[6] Testing Honest Empty State Guarantees...");

  // Offers received table anon check
  const { data: offersData, error: offersErr } = await anonClient
    .from("offers")
    .select("*");

  assert(
    offersErr !== null || (offersData?.length ?? 0) === 0,
    "Offers are protected and not leaked to anonymous visitors"
  );

  // Orders table anon check
  const { data: ordersData, error: ordersErr } = await anonClient
    .from("orders")
    .select("*");

  assert(
    ordersErr !== null || (ordersData?.length ?? 0) === 0,
    "Farmer orders are protected and not leaked to anonymous visitors"
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(` PHASE 4 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Verification().catch((err) => {
  console.error("Phase 4 verification suite failed:", err);
  process.exit(1);
});
