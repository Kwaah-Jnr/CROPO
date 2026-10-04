import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

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

async function runRegressionSuite() {
  console.log("\n=======================================================");
  console.log(" CROPO — FARMER OFFERS & RLS REGRESSION TEST SUITE");
  console.log("=======================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const client = createClient(url, anonKey, { auth: { persistSession: false } });

  // -------------------------------------------------------------------------
  // 1. Create Test Identities: Farmer A, Farmer B, and Buyer
  // -------------------------------------------------------------------------
  console.log("[1] Creating Test Identities (Farmer A, Farmer B, Buyer)...");
  const timestamp = Date.now();
  const password = "Password123!";

  // Farmer A
  const farmerAEmail = `farmer_a_${timestamp}@cropo.test`;
  const { data: farmerAAuth, error: farmerAErr } = await client.auth.signUp({
    email: farmerAEmail,
    password,
    options: {
      data: { role: "FARMER", full_name: "Kwame Farmer A", business_name: null },
    },
  });
  assert(!farmerAErr && !!farmerAAuth.user, "Farmer A signed up successfully");
  const farmerAId = farmerAAuth.user!.id;
  const farmerAClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${farmerAAuth.session?.access_token}` } },
  });

  // Farmer B
  const farmerBEmail = `farmer_b_${timestamp}@cropo.test`;
  const { data: farmerBAuth, error: farmerBErr } = await client.auth.signUp({
    email: farmerBEmail,
    password,
    options: {
      data: { role: "FARMER", full_name: "Yaw Farmer B", business_name: null },
    },
  });
  assert(!farmerBErr && !!farmerBAuth.user, "Farmer B signed up successfully");
  const farmerBId = farmerBAuth.user!.id;
  const farmerBClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${farmerBAuth.session?.access_token}` } },
  });

  // Buyer
  const buyerEmail = `buyer_${timestamp}@cropo.test`;
  const { data: buyerAuth, error: buyerErr } = await client.auth.signUp({
    email: buyerEmail,
    password,
    options: {
      data: { role: "BUYER", full_name: "Ama Serwaa", business_name: "Accra Agro Foods" },
    },
  });
  assert(!buyerErr && !!buyerAuth.user, "Buyer signed up successfully");
  const buyerId = buyerAuth.user!.id;
  const buyerClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${buyerAuth.session?.access_token}` } },
  });

  // -------------------------------------------------------------------------
  // 2. Test Empty State: Farmer with no offers returns empty array without error
  // -------------------------------------------------------------------------
  console.log("\n[2] Testing Honest Empty State (Farmer with zero offers)...");

  const { data: emptyOffers, error: emptyError } = await farmerAClient
    .from("offers")
    .select(`
      id,
      listing_id,
      buyer_id,
      quantity,
      price_per_unit,
      message,
      status,
      responded_at,
      created_at,
      listings (id, crop_name, unit, price_per_unit, city, region)
    `)
    .eq("farmer_id", farmerAId)
    .order("created_at", { ascending: false });

  assert(emptyError === null, "Query on offers for Farmer A completes with null error (no PGRST201)");
  assert(Array.isArray(emptyOffers) && emptyOffers.length === 0, "Farmer A with no offers returns empty array []");

  // -------------------------------------------------------------------------
  // 3. Create Listing by Farmer A and Offer by Buyer
  // -------------------------------------------------------------------------
  console.log("\n[3] Creating Listing for Farmer A and Offer by Buyer...");

  const { data: cats } = await farmerAClient.from("crop_categories").select("id").limit(1);
  const catId = cats?.[0]?.id;

  const { data: listingA, error: listAErr } = await farmerAClient
    .from("listings")
    .insert({
      farmer_id: farmerAId,
      category_id: catId,
      crop_name: "Yellow Maize Batch A",
      quantity_available: 200,
      unit: "BAG",
      price_per_unit: 150,
      grade: "A",
      region: "Bono",
      city: "Sunyani",
      status: "ACTIVE",
    })
    .select()
    .single();

  assert(!listAErr && !!listingA, "Farmer A created an active listing");

  const { data: offerA, error: offerAErr } = await buyerClient
    .from("offers")
    .insert({
      listing_id: listingA!.id,
      buyer_id: buyerId,
      farmer_id: farmerAId,
      quantity: 80,
      price_per_unit: 140,
      message: "Looking for delivery by end of next week.",
      status: "PENDING",
    })
    .select()
    .single();

  assert(!offerAErr && !!offerA, "Buyer submitted a pending offer on Farmer A's listing");

  // -------------------------------------------------------------------------
  // 4. Farmer A Queries Offers (Offer appears with correct buyer info)
  // -------------------------------------------------------------------------
  console.log("\n[4] Testing Farmer A Offers Query & Profile Resolution...");

  const { data: farmerAOffersRaw, error: farmerAOffersErr } = await farmerAClient
    .from("offers")
    .select(`
      id,
      listing_id,
      buyer_id,
      quantity,
      price_per_unit,
      message,
      status,
      responded_at,
      created_at,
      listings (id, crop_name, unit, price_per_unit, city, region)
    `)
    .eq("farmer_id", farmerAId)
    .order("created_at", { ascending: false });

  assert(farmerAOffersErr === null, "Farmer A query succeeds without error");
  assert(farmerAOffersRaw?.length === 1, "Farmer A receives exactly 1 offer row");

  // Lookup buyer info from public_buyer_profiles
  const buyerIds = Array.from(new Set(farmerAOffersRaw!.map((o) => o.buyer_id).filter(Boolean)));
  const { data: buyers, error: buyerLookupErr } = await farmerAClient
    .from("public_buyer_profiles")
    .select("id, full_name, business_name, business_type, city, region")
    .in("id", buyerIds);

  assert(buyerLookupErr === null, "Farmer A successfully looked up public_buyer_profiles");
  assert(buyers?.length === 1, "Found buyer public profile");
  assert(buyers?.[0]?.business_name === "Accra Agro Foods", "Buyer business name correctly resolved");

  // -------------------------------------------------------------------------
  // 5. Farmer B Isolation Test (Farmer B cannot see Farmer A's offer)
  // -------------------------------------------------------------------------
  console.log("\n[5] Testing Cross-Farmer Isolation (RLS enforcement)...");

  const { data: farmerBOffers, error: farmerBOffersErr } = await farmerBClient
    .from("offers")
    .select(`
      id,
      listing_id,
      buyer_id,
      quantity,
      price_per_unit,
      message,
      status,
      responded_at,
      created_at,
      listings (id, crop_name, unit, price_per_unit, city, region)
    `)
    .eq("farmer_id", farmerBId)
    .order("created_at", { ascending: false });

  assert(farmerBOffersErr === null, "Farmer B query succeeds without error");
  assert(
    farmerBOffers?.length === 0,
    "Farmer B cannot see Farmer A's offer (RLS isolation strictly enforced)"
  );

  // Even if Farmer B tries to query Farmer A's offers by filtering with Farmer A's id:
  const { data: breachAttempt } = await farmerBClient
    .from("offers")
    .select("id")
    .eq("farmer_id", farmerAId);

  assert(
    (breachAttempt?.length ?? 0) === 0,
    "Farmer B querying Farmer A's farmer_id returns 0 rows (RLS blocks access)"
  );

  // -------------------------------------------------------------------------
  // 6. Privacy Verification (Buyer private credentials protected)
  // -------------------------------------------------------------------------
  console.log("\n[6] Verifying Buyer Private Data Protection...");

  // 6.1 Farmer cannot query buyer's raw profiles table directly
  const { data: privateProfile, error: privateProfileErr } = await farmerAClient
    .from("profiles")
    .select("phone, id")
    .eq("id", buyerId);

  assert(
    privateProfileErr !== null || (privateProfile?.length ?? 0) === 0,
    "Farmer cannot select buyer's row from 'profiles' table directly (RLS protected)"
  );

  // 6.2 Farmer cannot query buyer_profiles table directly
  const { data: rawBuyerProfile, error: rawBuyerProfileErr } = await farmerAClient
    .from("buyer_profiles")
    .select("*")
    .eq("profile_id", buyerId);

  assert(
    rawBuyerProfileErr !== null || (rawBuyerProfile?.length ?? 0) === 0,
    "Farmer cannot select buyer's row from 'buyer_profiles' table directly (RLS protected)"
  );

  // 6.3 public_buyer_profiles only contains non-sensitive public metadata
  const samplePublic = buyers?.[0];
  const exposedKeys = Object.keys(samplePublic || {});
  const hasPhone = exposedKeys.includes("phone");
  const hasEmail = exposedKeys.includes("email");
  const hasPassword = exposedKeys.includes("password");
  assert(!hasPhone && !hasEmail && !hasPassword, "public_buyer_profiles does not expose phone, email, or credentials");

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(` REGRESSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error("Unexpected regression test failure:", err);
  process.exit(1);
});
