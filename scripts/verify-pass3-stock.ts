import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

type TestActor = {
  id: string;
  email: string;
  client: SupabaseClient;
};

async function createActor(role: "FARMER" | "BUYER", name: string): Promise<TestActor> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const email = `pass3_${role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@cropo.test`;
  const password = "Pass3TestPassword123!";

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: name,
      },
    },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create actor ${name}: ${error?.message}`);
  }

  // Session authentication client
  const authedClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
      },
    },
  });

  return {
    id: data.user.id,
    email,
    client: authedClient,
  };
}

async function runPass3StockSuite() {
  console.log("\n========================================================================");
  console.log(" CROPO PASS 3 — BUY NOW DELIVERY & STOCK INTEGRITY TEST SUITE (M6/H2)");
  console.log("========================================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // Fetch a crop category ID
  const { data: categories } = await anonClient.from("crop_categories").select("id").limit(1);
  const categoryId = categories?.[0]?.id;
  if (!categoryId) {
    throw new Error("No crop category found in database to attach to test listings");
  }

  console.log("[Setup] Creating authenticated test actors...");
  const farmer = await createActor("FARMER", "Pass 3 Farmer");
  const buyerA = await createActor("BUYER", "Pass 3 Buyer A");
  const buyerB = await createActor("BUYER", "Pass 3 Buyer B");
  console.log("Actors initialized: Farmer, Buyer A, Buyer B.\n");

  const createdListings: string[] = [];
  const createdOrders: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: pickup-only listing + delivery order = rejected (M6)
    // -------------------------------------------------------------------------
    console.log("[Test 1] Verifying pickup-only listing + delivery order is rejected...");

    const { data: listing1, error: l1Err } = await farmer.client
      .from("listings")
      .insert({
        farmer_id: farmer.id,
        category_id: categoryId,
        crop_name: "Pickup Only Cassava",
        quantity_available: 20,
        unit: "BAG",
        price_per_unit: 100,
        delivery_available: false, // Pickup only!
        region: "Eastern",
        city: "Koforidua",
        status: "ACTIVE",
      })
      .select()
      .single();

    assert(!l1Err && !!listing1, "Setup: Created pickup-only listing (delivery_available: false, stock: 20)", l1Err?.message);
    const listing1Id = listing1?.id;
    if (listing1Id) createdListings.push(listing1Id);

    // Buyer A attempts Buy Now with DELIVERY method
    const { data: order1Res, error: order1Err } = await buyerA.client.rpc("create_buy_now_order", {
      p_listing_id: listing1Id,
      p_quantity: 5,
      p_delivery_method: "DELIVERY",
      p_delivery_address: "Accra Central Market",
    });

    assert(
      !!order1Err && order1Err.message.includes("Delivery is not available for this listing"),
      "M6. Pickup-only listing + delivery order = rejected by database/RPC",
      order1Err ? order1Err.message : "Unexpectedly succeeded"
    );
    assert(!order1Res, "M6. No order created for invalid delivery selection");

    // Verify stock is strictly unconsumed
    const { data: l1CheckAfter } = await anonClient
      .from("listings")
      .select("quantity_available, status")
      .eq("id", listing1Id)
      .single();

    assert(
      l1CheckAfter?.quantity_available === 20,
      "M6. Stock is unconsumed and remains 20 after rejected delivery order"
    );

    // -------------------------------------------------------------------------
    // TEST 2: pickup listing + pickup order = allowed
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Verifying pickup listing + pickup order is allowed...");

    const { data: order2Res, error: order2Err } = await buyerA.client.rpc("create_buy_now_order", {
      p_listing_id: listing1Id,
      p_quantity: 5,
      p_delivery_method: "PICKUP",
    });

    assert(!order2Err && !!order2Res, "Pickup listing + pickup order = allowed", order2Err?.message);
    if (order2Res?.order_id) createdOrders.push(order2Res.order_id);

    // Check order fields in database
    const { data: o2Check } = await buyerA.client
      .from("orders")
      .select("status, delivery_method, subtotal, source")
      .eq("id", order2Res?.order_id)
      .single();

    assert(o2Check?.status === "PENDING", "Order created with initial status PENDING");
    assert(o2Check?.delivery_method === "PICKUP", "Order recorded with delivery_method = PICKUP");
    assert(o2Check?.source === "BUY_NOW", "Order recorded with source = BUY_NOW");
    assert(Number(o2Check?.subtotal) === 500, "Order subtotal calculated correctly (5 * 100 = 500 GHS)");

    // Verify stock was decremented from 20 to 15
    const { data: l1StockAfterPickup } = await anonClient
      .from("listings")
      .select("quantity_available, status")
      .eq("id", listing1Id)
      .single();

    assert(
      l1StockAfterPickup?.quantity_available === 15,
      "Listing stock decremented accurately (20 - 5 = 15)",
      `Remaining: ${l1StockAfterPickup?.quantity_available}`
    );
    assert(l1StockAfterPickup?.status === "ACTIVE", "Listing remains ACTIVE since stock > 0");

    // -------------------------------------------------------------------------
    // TEST 3: delivery-enabled listing + delivery order = allowed
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Verifying delivery-enabled listing + delivery order is allowed...");

    const { data: listing2, error: l2Err } = await farmer.client
      .from("listings")
      .insert({
        farmer_id: farmer.id,
        category_id: categoryId,
        crop_name: "Delivery Enabled Maize",
        quantity_available: 30,
        unit: "BAG",
        price_per_unit: 150,
        delivery_available: true, // Delivery enabled!
        region: "Ashanti",
        city: "Kumasi",
        status: "ACTIVE",
      })
      .select()
      .single();

    assert(!l2Err && !!listing2, "Setup: Created delivery-enabled listing (delivery_available: true, stock: 30)", l2Err?.message);
    const listing2Id = listing2?.id;
    if (listing2Id) createdListings.push(listing2Id);

    const { data: order3Res, error: order3Err } = await buyerA.client.rpc("create_buy_now_order", {
      p_listing_id: listing2Id,
      p_quantity: 10,
      p_delivery_method: "DELIVERY",
      p_delivery_address: "Tema Industrial Area, Block C",
    });

    assert(!order3Err && !!order3Res, "Delivery-enabled listing + delivery order = allowed", order3Err?.message);
    if (order3Res?.order_id) createdOrders.push(order3Res.order_id);

    const { data: o3Check } = await buyerA.client
      .from("orders")
      .select("status, delivery_method, delivery_address, subtotal")
      .eq("id", order3Res?.order_id)
      .single();

    assert(o3Check?.status === "PENDING", "Delivery order created in PENDING status");
    assert(o3Check?.delivery_method === "DELIVERY", "Order recorded with delivery_method = DELIVERY");
    assert(o3Check?.delivery_address === "Tema Industrial Area, Block C", "Destination delivery address recorded");

    // Verify stock decremented (30 - 10 = 20)
    const { data: l2StockAfter } = await anonClient
      .from("listings")
      .select("quantity_available")
      .eq("id", listing2Id)
      .single();

    assert(l2StockAfter?.quantity_available === 20, "Listing stock decremented accurately (30 - 10 = 20)");

    // -------------------------------------------------------------------------
    // TEST 4: insufficient stock = rejected
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Verifying insufficient stock is rejected...");

    // Listing 2 now has 20 units. Buyer A attempts to purchase 25 units.
    const { data: order4Res, error: order4Err } = await buyerA.client.rpc("create_buy_now_order", {
      p_listing_id: listing2Id,
      p_quantity: 25,
      p_delivery_method: "DELIVERY",
      p_delivery_address: "Tema Harbour",
    });

    assert(
      !!order4Err && order4Err.message.includes("Requested quantity exceeds available volume"),
      "Insufficient stock = rejected by database/RPC",
      order4Err ? order4Err.message : "Unexpectedly succeeded"
    );
    assert(!order4Res, "No order created when volume exceeds stock");

    // Stock must remain 20
    const { data: l2StockAfterReject } = await anonClient
      .from("listings")
      .select("quantity_available")
      .eq("id", listing2Id)
      .single();

    assert(l2StockAfterReject?.quantity_available === 20, "Listing stock remains unchanged (20) after rejected over-order");

    // -------------------------------------------------------------------------
    // TEST 5: concurrent stock reservation remains atomic
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Verifying concurrent stock reservation remains atomic...");

    // Create Listing 3 with exactly 10 units
    const { data: listing3, error: l3Err } = await farmer.client
      .from("listings")
      .insert({
        farmer_id: farmer.id,
        category_id: categoryId,
        crop_name: "Race Condition Tomatoes",
        quantity_available: 10,
        unit: "CRATE",
        price_per_unit: 80,
        delivery_available: true,
        region: "Greater Accra",
        city: "Madina",
        status: "ACTIVE",
      })
      .select()
      .single();

    assert(!l3Err && !!listing3, "Setup: Created listing with 10 units for concurrency race", l3Err?.message);
    const listing3Id = listing3?.id;
    if (listing3Id) createdListings.push(listing3Id);

    // Two buyers simultaneously attempt to buy 8 units each (total 16 > 10 available)
    const [callA, callB] = await Promise.all([
      buyerA.client.rpc("create_buy_now_order", {
        p_listing_id: listing3Id,
        p_quantity: 8,
        p_delivery_method: "PICKUP",
      }),
      buyerB.client.rpc("create_buy_now_order", {
        p_listing_id: listing3Id,
        p_quantity: 8,
        p_delivery_method: "PICKUP",
      }),
    ]);

    if (callA.data?.order_id) createdOrders.push(callA.data.order_id);
    if (callB.data?.order_id) createdOrders.push(callB.data.order_id);

    const aSucceeded = !callA.error && !!callA.data;
    const bSucceeded = !callB.error && !!callB.data;

    assert(
      (aSucceeded && !bSucceeded) || (!aSucceeded && bSucceeded),
      "Exactly one of the two competing orders succeeded, the other was rejected"
    );

    const rejectedError = aSucceeded ? callB.error : callA.error;
    assert(
      !!rejectedError && rejectedError.message.includes("Requested quantity exceeds available volume"),
      "Rejected concurrent order failed with 'Requested quantity exceeds available volume'",
      rejectedError?.message
    );

    // Verify final stock is exactly 10 - 8 = 2
    const { data: l3StockAfterRace } = await anonClient
      .from("listings")
      .select("quantity_available, status")
      .eq("id", listing3Id)
      .single();

    assert(
      l3StockAfterRace?.quantity_available === 2,
      "Listing stock accurately decremented to exactly 2 (never negative or double-allocated)",
      `Remaining: ${l3StockAfterRace?.quantity_available}`
    );
    assert(l3StockAfterRace?.status === "ACTIVE", "Listing remains ACTIVE with remaining volume 2");

  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up test records
    // -------------------------------------------------------------------------
    console.log("\n[Teardown] Cleaning up test records created during Pass 3 suite...");

    for (const orderId of createdOrders) {
      await buyerA.client.from("order_items").delete().eq("order_id", orderId);
      await buyerA.client.from("order_status_history").delete().eq("order_id", orderId);
      await buyerA.client.from("orders").delete().eq("id", orderId);
    }

    for (const listingId of createdListings) {
      await farmer.client.from("listings").delete().eq("id", listingId);
    }

    console.log("Teardown complete.\n");
  }

  console.log("========================================================================");
  console.log(` PASS 3 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass3StockSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
