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
  const email = `pass5_${role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@cropo.test`;
  const password = "Pass5TestPassword123!";

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

async function runPass5Suite() {
  console.log("\n========================================================================");
  console.log(" CROPO PASS 5 — LISTING REMOVAL & STOCK UPDATE INTEGRITY (M1 & M3)");
  console.log("========================================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const adminClient = serviceRoleKey
    ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    : null;

  // Fetch a crop category ID
  const { data: categories } = await anonClient.from("crop_categories").select("id").limit(1);
  const categoryId = categories?.[0]?.id;
  if (!categoryId) {
    throw new Error("No crop category found in database to attach to test listings");
  }

  console.log("[Setup] Creating authenticated test actors...");
  const farmer1 = await createActor("FARMER", "Pass 5 Farmer 1");
  const farmer2 = await createActor("FARMER", "Pass 5 Farmer 2");
  const buyer = await createActor("BUYER", "Pass 5 Buyer");
  console.log("Actors initialized: Farmer 1, Farmer 2, Buyer.\n");

  const createdListings: string[] = [];
  const createdOrders: string[] = [];

  try {
    // =========================================================================
    // SECTION 1: M1 — LOST UPDATE PREVENTION (OPTIMISTIC CONCURRENCY)
    // =========================================================================
    console.log("[M1 - Test 1] Verifying optimistic concurrency and lost update prevention...");

    // Step A: Farmer 1 lists produce with initial quantity 100
    const { data: l1, error: l1Err } = await farmer1.client
      .from("listings")
      .insert({
        farmer_id: farmer1.id,
        category_id: categoryId,
        crop_name: "Pass 5 Concurrency Maize",
        quantity_available: 100,
        unit: "KG",
        price_per_unit: 10,
        grade: "A",
        region: "Ashanti",
        city: "Kumasi",
        delivery_available: true,
        status: "ACTIVE",
      })
      .select("id, quantity_available, version, status")
      .single();

    if (l1Err || !l1) {
      throw new Error(`Failed to create test listing 1: ${l1Err?.message}`);
    }
    createdListings.push(l1.id);

    assert(l1.quantity_available === 100, "Initial listing quantity is 100");
    assert(l1.version === 1, "Initial listing version is 1", `Found: ${l1.version}`);

    // Step B: Concurrent purchase reduces stock to 60 (buyer purchases 40)
    const { data: orderRes, error: orderErr } = await buyer.client.rpc("create_buy_now_order", {
      p_listing_id: l1.id,
      p_quantity: 40,
      p_delivery_method: "PICKUP",
      p_notes: "Concurrent purchase test",
    });

    if (orderErr || !orderRes) {
      throw new Error(`Concurrent order failed: ${orderErr?.message}`);
    }
    const orderData = orderRes as { order_id: string; order_number: string };
    createdOrders.push(orderData.order_id);

    // Verify stock is now 60 and version incremented to 2
    const { data: l1AfterPurchase } = adminClient
      ? await adminClient.from("listings").select("quantity_available, version").eq("id", l1.id).single()
      : await farmer1.client.from("listings").select("quantity_available, version").eq("id", l1.id).single();

    assert(
      l1AfterPurchase?.quantity_available === 60,
      "Concurrent transaction reduced stock from 100 to 60",
      `Current stock: ${l1AfterPurchase?.quantity_available}`
    );
    assert(
      l1AfterPurchase?.version === 2,
      "Listing version automatically incremented to 2 after purchase",
      `Current version: ${l1AfterPurchase?.version}`
    );

    // Step C: Stale farmer update attempts to restore 100 using stale expected_version = 1
    const { error: staleUpdateErr } = await farmer1.client.rpc("update_farmer_listing", {
      p_listing_id: l1.id,
      p_expected_version: 1, // Stale version!
      p_quantity_available: 100, // Attempting to restore old quantity
      p_crop_name: "Pass 5 Concurrency Maize Stale Overwrite",
    });

    assert(
      !!staleUpdateErr,
      "Stale farmer update with expected_version=1 was rejected by database/RPC",
      staleUpdateErr?.message
    );
    assert(
      staleUpdateErr?.code === "P0001" ||
      staleUpdateErr?.code === "40001" ||
      Boolean(staleUpdateErr?.message?.includes("modified by another transaction")),
      "Rejection error specifically identifies transaction concurrency conflict",
      staleUpdateErr?.message
    );

    // Verify stock was NOT overwritten and remains 60
    const { data: l1AfterStale } = await farmer1.client
      .from("listings")
      .select("quantity_available, version")
      .eq("id", l1.id)
      .single();

    assert(
      l1AfterStale?.quantity_available === 60,
      "Stock was preserved at 60 (lost update prevented)",
      `Remaining stock: ${l1AfterStale?.quantity_available}`
    );
    assert(
      l1AfterStale?.version === 2,
      "Version remains at 2 after rejected stale update",
      `Version: ${l1AfterStale?.version}`
    );

    // Step D: Legitimate farmer update using current expected_version = 2
    const { error: legitErr } = await farmer1.client.rpc("update_farmer_listing", {
      p_listing_id: l1.id,
      p_expected_version: 2, // Current fresh version
      p_quantity_available: 75, // Legitimate edit
      p_crop_name: "Pass 5 Concurrency Maize Updated",
    });

    assert(!legitErr, "Legitimate farmer update with current expected_version=2 succeeded", legitErr?.message);

    const { data: l1AfterLegit } = await farmer1.client
      .from("listings")
      .select("quantity_available, version, crop_name")
      .eq("id", l1.id)
      .single();

    assert(
      l1AfterLegit?.quantity_available === 75,
      "Stock successfully updated to 75 by legitimate edit",
      `Quantity: ${l1AfterLegit?.quantity_available}`
    );
    assert(
      l1AfterLegit?.version === 3,
      "Listing version incremented to 3 after legitimate update",
      `Version: ${l1AfterLegit?.version}`
    );

    // =========================================================================
    // SECTION 2: M3 — DELETE LISTING (SECURE SOFT REMOVE)
    // =========================================================================
    console.log("\n[M3 - Test 2] Verifying secure soft removal, marketplace exclusion & offer safety...");

    // Step A: Farmer 1 creates a listing
    const { data: l2, error: l2Err } = await farmer1.client
      .from("listings")
      .insert({
        farmer_id: farmer1.id,
        category_id: categoryId,
        crop_name: "Pass 5 Soft Remove Tomatoes",
        quantity_available: 50,
        unit: "CRATE",
        price_per_unit: 120,
        grade: "B",
        region: "Greater Accra",
        city: "Ada",
        delivery_available: false,
        status: "ACTIVE",
      })
      .select("id, status")
      .single();

    if (l2Err || !l2) {
      throw new Error(`Failed to create test listing 2: ${l2Err?.message}`);
    }
    createdListings.push(l2.id);

    // Step B: Buyer creates a PENDING offer on listing 2
    const { data: offer1, error: offerErr } = await buyer.client
      .from("offers")
      .insert({
        listing_id: l2.id,
        farmer_id: farmer1.id,
        buyer_id: buyer.id,
        quantity: 10,
        price_per_unit: 100,
        message: "Offer on listing to be removed",
        status: "PENDING",
      })
      .select("id, status")
      .single();

    if (offerErr || !offer1) {
      throw new Error(`Failed to create test offer: ${offerErr?.message}`);
    }

    // Negative Test 2a: Direct client mutation to REMOVED must be blocked by RLS
    const { error: directMutErr } = await farmer1.client
      .from("listings")
      .update({ status: "REMOVED" })
      .eq("id", l2.id);

    assert(
      !!directMutErr,
      "Direct client update to status='REMOVED' is blocked by RLS check policy",
      directMutErr?.message
    );

    // Negative Test 2b: Farmer 2 cannot remove Farmer 1's listing
    const { error: f2RemoveErr } = await farmer2.client.rpc("remove_farmer_listing", {
      p_listing_id: l2.id,
    });

    assert(
      !!f2RemoveErr,
      "Farmer 2 cannot remove Farmer 1's listing (unauthorized rejection)",
      f2RemoveErr?.message
    );

    // Verify listing 2 is still ACTIVE
    const { data: l2StillActive } = await farmer1.client
      .from("listings")
      .select("status")
      .eq("id", l2.id)
      .single();
    assert(l2StillActive?.status === "ACTIVE", "Listing 2 remains ACTIVE after unauthorized removal attempt");

    // Step C: Authorized Farmer 1 soft removes their listing via remove_farmer_listing RPC
    const { data: removeRes, error: removeErr } = await farmer1.client.rpc("remove_farmer_listing", {
      p_listing_id: l2.id,
    });

    assert(!removeErr, "Farmer 1 soft removal via remove_farmer_listing succeeded", removeErr?.message);
    const removeData = removeRes as { success: boolean; status: string };
    assert(removeData?.status === "REMOVED", "RPC returned status='REMOVED'");

    // Verify listing record in DB is REMOVED (not hard-deleted)
    const { data: l2InDb } = await farmer1.client
      .from("listings")
      .select("id, status")
      .eq("id", l2.id)
      .single();

    assert(!!l2InDb, "Listing record still exists in database (NOT hard-deleted)");
    assert(l2InDb?.status === "REMOVED", "Listing status transitioned to REMOVED");

    // Step D: Removed listing disappears from public marketplace
    const { data: publicListing } = await anonClient
      .from("listings")
      .select("id")
      .eq("id", l2.id)
      .maybeSingle();

    assert(
      publicListing === null,
      "Removed listing is completely hidden from public marketplace (0 rows returned to anon)",
      publicListing ? "Found visible" : "Hidden"
    );

    // Step E: Existing pending offers on removed listing safely transition to EXPIRED
    const { data: offerAfterRemoval } = await buyer.client
      .from("offers")
      .select("status")
      .eq("id", offer1.id)
      .single();

    assert(
      offerAfterRemoval?.status === "EXPIRED",
      "Pending offers on removed listing safely transitioned to EXPIRED",
      `Offer status: ${offerAfterRemoval?.status}`
    );

    // Step F: Cannot modify a removed listing
    const { error: modifyRemovedErr } = await farmer1.client.rpc("update_farmer_listing", {
      p_listing_id: l2.id,
      p_crop_name: "Attempt To Revive Removed Listing",
    });

    assert(
      !!modifyRemovedErr && modifyRemovedErr.message.includes("Cannot modify a removed listing"),
      "Modifying a removed listing is rejected by update_farmer_listing RPC",
      modifyRemovedErr?.message
    );

    // Step G: Existing orders/history remain intact when a listing is removed
    console.log("\n[M3 - Test 3] Verifying order history remains intact when listing is removed...");

    // Create listing 3, place an order on it, then remove listing 3
    const { data: l3, error: l3Err } = await farmer1.client
      .from("listings")
      .insert({
        farmer_id: farmer1.id,
        category_id: categoryId,
        crop_name: "Pass 5 History Integrity Peppers",
        quantity_available: 30,
        unit: "BAG",
        price_per_unit: 80,
        grade: "A",
        region: "Volta",
        city: "Ho",
        delivery_available: false,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (l3Err || !l3) {
      throw new Error(`Failed to create test listing 3: ${l3Err?.message}`);
    }
    createdListings.push(l3.id);

    const { data: order3Res, error: o3Err } = await buyer.client.rpc("create_buy_now_order", {
      p_listing_id: l3.id,
      p_quantity: 10,
      p_delivery_method: "PICKUP",
      p_notes: "Order history test before removal",
    });

    if (o3Err || !order3Res) {
      throw new Error(`Failed to create order on listing 3: ${o3Err?.message}`);
    }
    const order3Data = order3Res as { order_id: string; order_number: string };
    createdOrders.push(order3Data.order_id);

    // Soft remove listing 3
    const { error: removeL3Err } = await farmer1.client.rpc("remove_farmer_listing", {
      p_listing_id: l3.id,
    });
    assert(!removeL3Err, "Listing 3 removed successfully after order placement");

    // Verify order and order items are intact
    const { data: orderAfterL3Removal } = await buyer.client
      .from("orders")
      .select("id, status, subtotal, delivery_method")
      .eq("id", order3Data.order_id)
      .single();

    assert(!!orderAfterL3Removal, "Existing order record remains intact after listing soft removal");
    assert(orderAfterL3Removal?.status === "PENDING", "Order retains original status PENDING");

    const { data: orderItemsAfterRemoval } = await buyer.client
      .from("order_items")
      .select("id, listing_id, crop_name, quantity, price_per_unit")
      .eq("order_id", order3Data.order_id);

    assert(
      (orderItemsAfterRemoval?.length ?? 0) > 0,
      "Order line items remain completely intact and linked after listing removal"
    );
    assert(
      orderItemsAfterRemoval?.[0]?.listing_id === l3.id,
      "Order item still references listing_id without foreign key breakdown"
    );

  } finally {
    // =========================================================================
    // TEARDOWN
    // =========================================================================
    console.log("\n[Teardown] Cleaning up test records created during Pass 5 suite...");

    if (adminClient) {
      for (const orderId of createdOrders) {
        await adminClient.from("order_items").delete().eq("order_id", orderId);
        await adminClient.from("order_status_history").delete().eq("order_id", orderId);
        await adminClient.from("orders").delete().eq("id", orderId);
      }

      for (const listingId of createdListings) {
        await adminClient.from("offers").delete().eq("listing_id", listingId);
        await adminClient.from("listings").delete().eq("id", listingId);
      }

      // Cleanup test user profiles
      await adminClient.from("profiles").delete().in("id", [farmer1.id, farmer2.id, buyer.id]);
    } else {
      // Fallback cleanup using actor clients
      for (const orderId of createdOrders) {
        await buyer.client.from("order_items").delete().eq("order_id", orderId);
        await buyer.client.from("orders").delete().eq("id", orderId);
      }
      for (const listingId of createdListings) {
        await farmer1.client.from("offers").delete().eq("listing_id", listingId);
      }
    }

    console.log("Teardown complete.\n");
  }

  console.log("========================================================================");
  console.log(` PASS 5 VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass5Suite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
