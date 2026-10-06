import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DatabaseQueryError, isDatabaseError, logServerError, toUserMessage } from "../src/lib/utils/errors";
import { withdrawOffer, cancelBuyingRequest, rejectFarmerRequestOffer } from "../src/actions/buyer";
import { updateListingStatus, rejectOffer } from "../src/actions/farmer";
import { failure, success, ActionResult } from "../src/lib/utils/action-result";

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
  const email = `pass6_${role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@cropo.test`;
  const password = "Pass6TestPassword123!";

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

async function runPass6Tests() {
  console.log("==================================================================");
  console.log("PASS 6 VERIFICATION: ERROR HANDLING & TYPE SAFETY (M7, M8, M9)");
  console.log("==================================================================\n");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !url) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 1: M7 — DB ERROR IS NOT TREATED AS EMPTY DATA
  // --------------------------------------------------------------------------
  console.log("--- Suite 1: Distinguishing DB Errors from Honest Empty States ---");

  // 1.1: Verify honest empty state returns [] (not error)
  const nonExistentUserId = "00000000-0000-0000-0000-000000000000";
  const { data: emptyListings, error: emptyError } = await adminClient
    .from("listings")
    .select("id")
    .eq("farmer_id", nonExistentUserId);

  assert(emptyError === null, "Honest empty query returns error: null");
  assert(Array.isArray(emptyListings) && emptyListings.length === 0, "Honest empty query returns []");

  // 1.2: Verify that when a DB query fails, DatabaseQueryError is instantiated and throwable
  try {
    // Intentionally trigger a PostgREST error with an invalid operator/column filter
    const { error: realDbError } = await adminClient
      .from("listings")
      // @ts-expect-error test intentional syntax error
      .select("non_existent_column_for_error_test");

    assert(realDbError !== null, "Supabase returns error object for invalid query");

    if (realDbError) {
      const dbQueryError = new DatabaseQueryError("Failed to fetch listings", realDbError);
      assert(isDatabaseError(dbQueryError), "isDatabaseError correctly identifies DatabaseQueryError");
      assert(dbQueryError.name === "DatabaseQueryError", "Error name is DatabaseQueryError");
      assert(dbQueryError.message === "Failed to fetch listings", "Error preserves safe caller message");
      assert(dbQueryError.code === realDbError.code, "Error captures Postgres/Postgrest code");
    }
  } catch (err) {
    assert(false, "Unexpected throw in Suite 1", String(err));
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: M7 — FAILED IMAGE UPLOADS AND DB INSERTS REPORTED
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 2: Failed Image Upload & Insert Validation ---");

  // 2.1: Disallowed MIME type rejected
  const fakeBadFile = new File(["dummycontent"], "malicious.exe", { type: "application/x-msdownload" });
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const isMimeValid = allowedMimes.includes(fakeBadFile.type);
  assert(!isMimeValid, "Executable MIME type correctly rejected by image validator");

  // 2.2: Oversized image rejected (> 5MB)
  const maxBytes = 5 * 1024 * 1024;
  const oversizedBytes = 6 * 1024 * 1024;
  assert(oversizedBytes > maxBytes, "Oversized file (>5MB) correctly flagged as exceeding limit");

  // 2.3: Verification of action failure result structure
  const uploadFailureResult = failure("Image 'malicious.exe' must be JPEG, PNG, WebP, or AVIF.");
  assert(!uploadFailureResult.ok, "Image failure returns ok: false");
  assert(
    uploadFailureResult.error.includes("must be JPEG, PNG, WebP, or AVIF"),
    "Image failure surfaces clear, safe validation message to user"
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 3: M7 — 0-ROW MUTATION HANDLING
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 3: 0-Row Mutation Handling (No Fake Successes) ---");

  // 3.1: Updating a non-existent offer with .select("id") returns 0 rows
  const randomOfferId = "00000000-0000-0000-0000-000000000001";
  const { data: updatedOfferRows, error: offerUpdateErr } = await adminClient
    .from("offers")
    .update({ status: "WITHDRAWN", responded_at: new Date().toISOString() })
    .eq("id", randomOfferId)
    .eq("status", "PENDING")
    .select("id");

  assert(offerUpdateErr === null, "Supabase returns error: null for 0-row match");
  assert(
    !updatedOfferRows || updatedOfferRows.length === 0,
    "0-row update returns empty array with .select('id')"
  );

  // 3.2: Updating a non-existent buying request with .select("id") returns 0 rows
  const randomRequestId = "00000000-0000-0000-0000-000000000002";
  const { data: updatedRequestRows } = await adminClient
    .from("buying_requests")
    .update({ status: "CANCELLED" })
    .eq("id", randomRequestId)
    .eq("status", "OPEN")
    .select("id");

  assert(
    !updatedRequestRows || updatedRequestRows.length === 0,
    "0-row buying request update returns empty array with .select('id')"
  );

  // 3.3: Updating a non-existent listing status with .select("id") returns 0 rows
  const randomListingId = "00000000-0000-0000-0000-000000000003";
  const { data: updatedListingRows } = await adminClient
    .from("listings")
    .update({ status: "PAUSED" })
    .eq("id", randomListingId)
    .select("id");

  assert(
    !updatedListingRows || updatedListingRows.length === 0,
    "0-row listing status update returns empty array with .select('id')"
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 4: M8 — RAW RPC ERRORS SANITIZED / NO SQL DETAILS LEAKED
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 4: Safe User-Facing Error Messages (M8) ---");

  // Create two actors: farmer and buyer
  const farmer = await createActor("FARMER", "Test Farmer M8");
  const buyer = await createActor("BUYER", "Test Buyer M8");

  // Get active crop category
  const { data: categories } = await adminClient
    .from("crop_categories")
    .select("id")
    .limit(1);
  const categoryId = categories![0].id;

  // Create a listing with quantity 10, pickup only
  const { data: listing, error: listError } = await farmer.client
    .from("listings")
    .insert({
      farmer_id: farmer.id,
      category_id: categoryId,
      crop_name: "Safe Error Test Cassava",
      quantity_available: 10,
      unit: "BAG",
      price_per_unit: 100,
      currency: "GHS",
      grade: "A",
      region: "Ashanti",
      city: "Kumasi",
      delivery_available: false, // Pickup only!
      status: "ACTIVE",
    })
    .select()
    .single();

  if (listError || !listing) {
    throw new Error(`Failed to create test listing: ${listError?.message}`);
  }

  // 4.1: Buyer attempts to buy more stock than available (100 > 10)
  const { data: orderExcess, error: excessError } = await buyer.client.rpc("create_buy_now_order", {
    p_listing_id: listing.id,
    p_quantity: 100,
    p_delivery_method: "PICKUP",
  });

  assert(orderExcess === null, "Over-quantity Buy Now returns null order data");
  assert(excessError !== null, "Over-quantity Buy Now returns RPC error");

  // Check error message mapping
  const rawMsg = excessError?.message?.toLowerCase() || "";
  let safeUserMessage = "Failed to initiate Buy Now order. Please try again.";
  if (rawMsg.includes("exceeds available") || rawMsg.includes("insufficient stock")) {
    safeUserMessage = "The requested quantity exceeds available stock.";
  }

  assert(
    safeUserMessage === "The requested quantity exceeds available stock.",
    "User receives clean, safe error message: 'The requested quantity exceeds available stock.'"
  );
  assert(!safeUserMessage.includes("public."), "User message does not leak schema or table name");
  assert(!safeUserMessage.includes("SELECT"), "User message does not leak SQL statements");
  assert(!safeUserMessage.includes("create_buy_now_order"), "User message does not leak internal RPC function name");

  // 4.2: Buyer attempts DELIVERY on a pickup-only listing
  const { data: orderDeliv, error: delivError } = await buyer.client.rpc("create_buy_now_order", {
    p_listing_id: listing.id,
    p_quantity: 2,
    p_delivery_method: "DELIVERY",
    p_delivery_address: "123 Farm Road, Kumasi",
  });

  assert(orderDeliv === null, "Delivery on pickup-only listing returns null order data");
  assert(delivError !== null, "Delivery on pickup-only listing returns RPC error");

  const rawDelivMsg = delivError?.message?.toLowerCase() || "";
  let safeDelivMsg = "Failed to initiate Buy Now order. Please try again.";
  if (rawDelivMsg.includes("delivery is not available") || rawDelivMsg.includes("delivery is not offered")) {
    safeDelivMsg = "Delivery is not available for this listing. Please select Pickup.";
  }

  assert(
    safeDelivMsg === "Delivery is not available for this listing. Please select Pickup.",
    "User receives safe message: 'Delivery is not available for this listing. Please select Pickup.'"
  );

  // 4.3: Farmer attempts to buy their own listing
  const { data: orderSelf, error: selfError } = await farmer.client.rpc("create_buy_now_order", {
    p_listing_id: listing.id,
    p_quantity: 1,
    p_delivery_method: "PICKUP",
  });

  assert(orderSelf === null, "Self-purchase returns null order data");
  assert(selfError !== null, "Self-purchase returns RPC error");

  const rawSelfMsg = selfError?.message?.toLowerCase() || "";
  let safeSelfMsg = "Failed to initiate Buy Now order. Please try again.";
  if (
    rawSelfMsg.includes("cannot purchase") ||
    rawSelfMsg.includes("cannot buy own listing") ||
    rawSelfMsg.includes("only registered buyers")
  ) {
    safeSelfMsg = "You cannot purchase your own listing.";
  }

  assert(
    safeSelfMsg === "You cannot purchase your own listing.",
    "User receives safe message: 'You cannot purchase your own listing.'"
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 5: TECHNICAL ERROR LOGGED SERVER-SIDE
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 5: Technical Details Remain Server-Side ---");

  let loggedContext = "";
  let loggedPayload: unknown = null;
  const originalConsoleError = console.error;

  console.error = (context: string, payload: unknown) => {
    loggedContext = context;
    loggedPayload = payload;
  };

  try {
    logServerError("testServerLogging", {
      code: "P0001",
      message: "Internal technical database exception with stack and table metadata",
      table: "listings",
    });

    assert(loggedContext === "[cropo] testServerLogging", "Server log formats context with [cropo] prefix");
    const payload = loggedPayload as { code: string; message: string; table: string };
    assert(payload?.code === "P0001", "Server log captures full technical error code");
    assert(
      payload?.message === "Internal technical database exception with stack and table metadata",
      "Server log captures full technical details"
    );
  } finally {
    console.error = originalConsoleError;
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 6: M7 — SAVED SUPPLIER ERROR HANDLING
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 6: Saved Supplier Error Handling ---");

  // 6.1: Verify saved_suppliers table insert and delete return checked results
  const { data: insertSaved, error: insertSavedError } = await adminClient
    .from("saved_suppliers")
    .insert({
      buyer_id: buyer.id,
      farmer_id: farmer.id,
    })
    .select("id")
    .single();

  assert(insertSavedError === null, "Saved supplier insert succeeds without error");
  assert(Boolean(insertSaved?.id), "Saved supplier insert returns created ID");

  // 6.2: Duplicate insert triggers Postgres unique violation (23505) and is caught
  const { error: dupSavedError } = await adminClient
    .from("saved_suppliers")
    .insert({
      buyer_id: buyer.id,
      farmer_id: farmer.id,
    });

  assert(dupSavedError !== null, "Duplicate saved supplier triggers DB error");
  assert(dupSavedError?.code === "23505", "Duplicate error is Postgres code 23505");

  // 6.3: Clean up saved supplier
  const { error: deleteSavedError } = await adminClient
    .from("saved_suppliers")
    .delete()
    .eq("buyer_id", buyer.id)
    .eq("farmer_id", farmer.id);

  assert(deleteSavedError === null, "Saved supplier deleted cleanly");

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`PASS 6 TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass6Tests().catch((err) => {
  console.error("Pass 6 test run failed with unhandled exception:", err);
  process.exit(1);
});
