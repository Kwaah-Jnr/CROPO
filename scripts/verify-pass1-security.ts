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

async function createAuthenticatedClient(
  url: string,
  anonKey: string,
  email: string,
  password: string,
  role: "BUYER" | "FARMER",
  fullName: string
): Promise<{ client: SupabaseClient; userId: string }> {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
    },
  });

  if (error || !data.user || !data.session) {
    throw new Error(`Failed to create test user (${email}): ${error?.message}`);
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  });

  return { client, userId: data.user.id };
}

async function runPass1SecuritySuite() {
  console.log("\n========================================================================");
  console.log(" CROPO PASS 1 — HARDENED OFFER & REQUEST-OFFER SECURITY TEST SUITE (H3/H4)");
  console.log("========================================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase URL/Key in .env.local");
    process.exit(1);
  }

  const timestamp = Date.now();
  const password = "Pass1TestPassword123!";

  console.log("[Setup] Creating authenticated test actors...");
  const buyer = await createAuthenticatedClient(
    url,
    anonKey,
    `pass1_buyer_${timestamp}@cropo.test`,
    password,
    "BUYER",
    "Pass1 Test Buyer"
  );
  const farmerA = await createAuthenticatedClient(
    url,
    anonKey,
    `pass1_farmer_a_${timestamp}@cropo.test`,
    password,
    "FARMER",
    "Pass1 Farmer A"
  );
  const farmerB = await createAuthenticatedClient(
    url,
    anonKey,
    `pass1_farmer_b_${timestamp}@cropo.test`,
    password,
    "FARMER",
    "Pass1 Farmer B"
  );

  console.log("Actors initialized: Buyer, Farmer A, Farmer B.\n");

  // Track created entity IDs for teardown
  const createdOrders: string[] = [];
  const createdListings: string[] = [];
  const createdRequests: string[] = [];

  // Helper to fetch any valid crop category
  const { data: categories } = await farmerA.client
    .from("crop_categories")
    .select("id")
    .limit(1);
  const categoryId = categories?.[0]?.id;

  try {
    // -----------------------------------------------------------------------
    // SETUP: Create base listing and buying request
    // -----------------------------------------------------------------------
    const { data: listingData, error: listingErr } = await farmerA.client
      .from("listings")
      .insert({
        farmer_id: farmerA.userId,
        category_id: categoryId,
        crop_name: "Pass1 Security Maize",
        quantity_available: 20,
        unit: "BAG",
        price_per_unit: 150.0,
        grade: "A",
        region: "Ashanti",
        status: "ACTIVE",
        delivery_available: true,
      })
      .select("id")
      .single();

    assert(!listingErr && !!listingData, "Setup: Farmer A creates listing (stock: 20)", listingErr?.message);
    const listingId = listingData?.id;
    if (listingId) createdListings.push(listingId);

    const { data: requestData, error: reqErr } = await buyer.client
      .from("buying_requests")
      .insert({
        buyer_id: buyer.userId,
        category_id: categoryId,
        crop_name: "Pass1 Demand Maize",
        quantity: 50,
        unit: "BAG",
        desired_grade: "A",
        destination_region: "Greater Accra",
        destination_city: "Accra Central",
        status: "OPEN",
      })
      .select("id")
      .single();

    assert(!reqErr && !!requestData, "Setup: Buyer creates open buying request", reqErr?.message);
    const requestId = requestData?.id;
    if (requestId) createdRequests.push(requestId);

    // Farmer A submits a quote for the buying request (quantity: 25, price: 140)
    const { data: quoteA, error: quoteAErr } = await farmerA.client
      .from("request_offers")
      .insert({
        request_id: requestId,
        farmer_id: farmerA.userId,
        quantity: 25,
        price_per_unit: 140.0,
        status: "PENDING",
      })
      .select("id")
      .single();

    assert(!quoteAErr && !!quoteA, "Setup: Farmer A submits quote (25 bags @ 140 GHS)", quoteAErr?.message);
    const quoteAId = quoteA?.id;

    // -----------------------------------------------------------------------
    // TEST A: Buyer cannot modify farmer quote price
    // -----------------------------------------------------------------------
    console.log("\n[Test A] Verifying buyer cannot modify quote price...");
    const { error: buyerPriceTamperErr } = await buyer.client
      .from("request_offers")
      .update({ price_per_unit: 10.0 } as unknown as Record<string, unknown>)
      .eq("id", quoteAId);

    assert(
      buyerPriceTamperErr !== null,
      "A. Buyer cannot modify farmer quote price (denied by permissions/RLS)",
      buyerPriceTamperErr?.message
    );

    const { data: verifyPrice } = await buyer.client
      .from("request_offers")
      .select("price_per_unit")
      .eq("id", quoteAId)
      .single();
    assert(
      verifyPrice?.price_per_unit === 140 || verifyPrice?.price_per_unit === "140",
      "A. Quote price remains unmodified in database"
    );

    // -----------------------------------------------------------------------
    // TEST B: Buyer cannot modify farmer quote quantity
    // -----------------------------------------------------------------------
    console.log("\n[Test B] Verifying buyer cannot modify quote quantity...");
    const { error: buyerQtyTamperErr } = await buyer.client
      .from("request_offers")
      .update({ quantity: 500 } as unknown as Record<string, unknown>)
      .eq("id", quoteAId);

    assert(
      buyerQtyTamperErr !== null,
      "B. Buyer cannot modify farmer quote quantity (denied by permissions/RLS)",
      buyerQtyTamperErr?.message
    );

    const { data: verifyQty } = await buyer.client
      .from("request_offers")
      .select("quantity")
      .eq("id", quoteAId)
      .single();
    assert(
      verifyQty?.quantity === 25 || verifyQty?.quantity === "25",
      "B. Quote quantity remains unmodified in database"
    );

    // -----------------------------------------------------------------------
    // TEST D: Buyer cannot directly mark quote ACCEPTED without order creation
    // -----------------------------------------------------------------------
    console.log("\n[Test D] Verifying buyer cannot directly set quote status to ACCEPTED...");
    const { error: directAcceptErr } = await buyer.client
      .from("request_offers")
      .update({ status: "ACCEPTED" })
      .eq("id", quoteAId);

    assert(
      directAcceptErr !== null,
      "D. Buyer cannot directly set quote status to ACCEPTED via PostgREST (RLS check denies)",
      directAcceptErr?.message
    );

    const { data: checkQuoteStatus } = await buyer.client
      .from("request_offers")
      .select("status")
      .eq("id", quoteAId)
      .single();
    assert(checkQuoteStatus?.status === "PENDING", "D. Quote remains PENDING in database");

    // -----------------------------------------------------------------------
    // TEST E: Farmer cannot directly mark offer ACCEPTED without order creation
    // -----------------------------------------------------------------------
    console.log("\n[Test E] Verifying farmer cannot directly set direct offer to ACCEPTED...");
    // Buyer makes a direct offer on Farmer A's listing
    const { data: directOffer, error: offerErr } = await buyer.client
      .from("offers")
      .insert({
        listing_id: listingId,
        buyer_id: buyer.userId,
        farmer_id: farmerA.userId,
        quantity: 5,
        price_per_unit: 140.0,
        status: "PENDING",
      })
      .select("id")
      .single();

    assert(!offerErr && !!directOffer, "Setup: Buyer creates direct listing offer", offerErr?.message);
    const offerId = directOffer?.id;

    // Farmer A attempts to directly PATCH status = 'ACCEPTED' without RPC
    const { error: farmerDirectAcceptErr } = await farmerA.client
      .from("offers")
      .update({ status: "ACCEPTED" })
      .eq("id", offerId);

    assert(
      farmerDirectAcceptErr !== null,
      "E. Farmer cannot directly set offer to ACCEPTED via PostgREST (RLS check denies)",
      farmerDirectAcceptErr?.message
    );

    const { data: checkOfferStatus } = await farmerA.client
      .from("offers")
      .select("status")
      .eq("id", offerId)
      .single();
    assert(checkOfferStatus?.status === "PENDING", "E. Offer remains PENDING in database");

    // -----------------------------------------------------------------------
    // TEST H: Competing quotes receive correct final statuses upon acceptance
    // -----------------------------------------------------------------------
    console.log("\n[Test H] Testing competing quote resolution on quote acceptance...");
    // Farmer B submits competing quote (quantity: 20, price: 135)
    const { data: quoteB, error: quoteBErr } = await farmerB.client
      .from("request_offers")
      .insert({
        request_id: requestId,
        farmer_id: farmerB.userId,
        quantity: 20,
        price_per_unit: 135.0,
        status: "PENDING",
      })
      .select("id")
      .single();

    assert(!quoteBErr && !!quoteB, "Setup: Farmer B submits competing quote on request", quoteBErr?.message);
    const quoteBId = quoteB?.id;

    // Buyer accepts Quote A via RPC
    const { data: acceptRpcRes, error: acceptRpcErr } = await buyer.client.rpc(
      "accept_request_offer_and_create_order",
      { p_request_offer_id: quoteAId }
    );

    assert(!acceptRpcErr && !!acceptRpcRes, "H. accept_request_offer_and_create_order executes successfully", acceptRpcErr?.message);
    if (acceptRpcRes?.order_id) createdOrders.push(acceptRpcRes.order_id);

    // Verify Quote A is ACCEPTED
    const { data: qACheck } = await buyer.client
      .from("request_offers")
      .select("status")
      .eq("id", quoteAId)
      .single();
    assert(qACheck?.status === "ACCEPTED", "H. Winning quote marked ACCEPTED");

    // Verify Buying Request is FULFILLED
    const { data: reqCheck } = await buyer.client
      .from("buying_requests")
      .select("status")
      .eq("id", requestId)
      .single();
    assert(reqCheck?.status === "FULFILLED", "H. Buying request marked FULFILLED");

    // Verify Competing Quote B was automatically REJECTED
    const { data: qBCheck } = await farmerB.client
      .from("request_offers")
      .select("status")
      .eq("id", quoteBId)
      .single();
    assert(qBCheck?.status === "REJECTED", "H. Competing pending quote automatically transitioned to REJECTED");

    // -----------------------------------------------------------------------
    // TEST C: Farmer cannot illegally modify accepted quote
    // -----------------------------------------------------------------------
    console.log("\n[Test C] Verifying farmer cannot modify an already accepted quote...");
    await farmerA.client
      .from("request_offers")
      .update({ status: "WITHDRAWN" })
      .eq("id", quoteAId);

    // PostgREST with RLS returns either an error or 0 modified rows
    const { data: verifyAcceptedUnchanged } = await farmerA.client
      .from("request_offers")
      .select("status")
      .eq("id", quoteAId)
      .single();
    assert(
      verifyAcceptedUnchanged?.status === "ACCEPTED",
      "C. Farmer cannot withdraw or alter an already ACCEPTED quote"
    );

    // -----------------------------------------------------------------------
    // TEST F: Request quote cannot be accepted twice
    // -----------------------------------------------------------------------
    console.log("\n[Test F] Verifying quote cannot be accepted a second time...");
    const { error: doubleAcceptErr } = await buyer.client.rpc(
      "accept_request_offer_and_create_order",
      { p_request_offer_id: quoteAId }
    );

    assert(
      doubleAcceptErr !== null,
      "F. Double acceptance rejected by RPC ('Supplier offer is not pending')",
      doubleAcceptErr?.message
    );

    // Also verify competing quote B cannot be accepted now that request is fulfilled
    const { error: acceptRejectedQuoteErr } = await buyer.client.rpc(
      "accept_request_offer_and_create_order",
      { p_request_offer_id: quoteBId }
    );
    assert(
      acceptRejectedQuoteErr !== null,
      "F. Attempting to accept competing quote fails ('Supplier offer is not pending')",
      acceptRejectedQuoteErr?.message
    );

    // -----------------------------------------------------------------------
    // TEST G: Closed/cancelled request cannot accept quote
    // -----------------------------------------------------------------------
    console.log("\n[Test G] Verifying closed/cancelled request cannot accept quote...");
    // Create new buying request and cancel it
    const { data: req2 } = await buyer.client
      .from("buying_requests")
      .insert({
        buyer_id: buyer.userId,
        category_id: categoryId,
        crop_name: "Cancelled Request Yam",
        quantity: 30,
        unit: "BAG",
        desired_grade: "B",
        destination_region: "Eastern",
        status: "OPEN",
      })
      .select("id")
      .single();

    if (req2?.id) createdRequests.push(req2.id);

    // Farmer A submits a quote for req2
    const { data: quoteG } = await farmerA.client
      .from("request_offers")
      .insert({
        request_id: req2!.id,
        farmer_id: farmerA.userId,
        quantity: 30,
        price_per_unit: 200.0,
        status: "PENDING",
      })
      .select("id")
      .single();

    // Buyer cancels the request
    await buyer.client
      .from("buying_requests")
      .update({ status: "CANCELLED" })
      .eq("id", req2!.id);

    // Buyer attempts to accept quote on cancelled request
    const { error: acceptCancelledErr } = await buyer.client.rpc(
      "accept_request_offer_and_create_order",
      { p_request_offer_id: quoteG!.id }
    );

    assert(
      acceptCancelledErr !== null && acceptCancelledErr.message.includes("no longer open"),
      "G. Cancelled request cannot accept quote ('Buying request is no longer open')",
      acceptCancelledErr?.message
    );

    // -----------------------------------------------------------------------
    // TEST I: Listing stock cannot be oversold & decrements atomically
    // -----------------------------------------------------------------------
    console.log("\n[Test I] Testing listing stock validation and atomic decrement...");
    // Create a new listing with exactly 10 units
    const { data: stockListing } = await farmerA.client
      .from("listings")
      .insert({
        farmer_id: farmerA.userId,
        category_id: categoryId,
        crop_name: "Limited Stock Plantain",
        quantity_available: 10,
        unit: "BUNCH",
        price_per_unit: 45.0,
        grade: "A",
        region: "Western",
        status: "ACTIVE",
        delivery_available: true,
      })
      .select("id")
      .single();

    const stockListingId = stockListing!.id;
    createdListings.push(stockListingId);

    // Buyer creates a new request
    const { data: stockReq } = await buyer.client
      .from("buying_requests")
      .insert({
        buyer_id: buyer.userId,
        category_id: categoryId,
        crop_name: "Plantain RFQ",
        quantity: 20,
        unit: "BUNCH",
        desired_grade: "A",
        destination_region: "Western",
        status: "OPEN",
      })
      .select("id")
      .single();

    createdRequests.push(stockReq!.id);

    // Farmer A quotes 15 units backed by the listing (which only has 10 units)
    const { data: oversellQuote } = await farmerA.client
      .from("request_offers")
      .insert({
        request_id: stockReq!.id,
        farmer_id: farmerA.userId,
        listing_id: stockListingId,
        quantity: 15, // > 10 available
        price_per_unit: 45.0,
        status: "PENDING",
      })
      .select("id")
      .single();

    // Buyer attempts to accept quote that exceeds stock
    const { error: oversellErr } = await buyer.client.rpc(
      "accept_request_offer_and_create_order",
      { p_request_offer_id: oversellQuote!.id }
    );

    assert(
      oversellErr !== null && oversellErr.message.includes("Insufficient stock"),
      "I. Overselling rejected by RPC ('Insufficient stock available in referenced listing')",
      oversellErr?.message
    );

    // Verify stock remains untouched at 10
    const { data: verifyStockUnchanged } = await farmerA.client
      .from("listings")
      .select("quantity_available")
      .eq("id", stockListingId)
      .single();
    assert(
      verifyStockUnchanged?.quantity_available === 10 || verifyStockUnchanged?.quantity_available === "10",
      "I. Listing stock unchanged after rejected oversell attempt"
    );

    // Farmer A withdraws the unaccepted oversell quote
    await farmerA.client
      .from("request_offers")
      .update({ status: "WITHDRAWN" })
      .eq("id", oversellQuote!.id);

    // Farmer A quotes 8 units backed by the listing (10 available)
    const { data: validStockQuote, error: validStockQuoteErr } = await farmerA.client
      .from("request_offers")
      .insert({
        request_id: stockReq!.id,
        farmer_id: farmerA.userId,
        listing_id: stockListingId,
        quantity: 8,
        price_per_unit: 45.0,
        status: "PENDING",
      })
      .select("id")
      .single();

    assert(!validStockQuoteErr && !!validStockQuote, "Setup: Farmer A quotes 8 units with stock backing", validStockQuoteErr?.message);


    // Buyer accepts valid stock quote
    const { data: validStockOrder, error: validStockErr } = await buyer.client.rpc(
      "accept_request_offer_and_create_order",
      { p_request_offer_id: validStockQuote!.id }
    );

    assert(!validStockErr && !!validStockOrder, "I. Valid stock-backed quote accepted cleanly", validStockErr?.message);
    if (validStockOrder?.order_id) createdOrders.push(validStockOrder.order_id);

    // Verify stock was decremented from 10 to 2
    const { data: verifyDecrementedStock } = await farmerA.client
      .from("listings")
      .select("quantity_available, status")
      .eq("id", stockListingId)
      .single();

    assert(
      Number(verifyDecrementedStock?.quantity_available) === 2,
      "I. Listing stock decremented accurately (10 - 8 = 2)"
    );
    assert(
      verifyDecrementedStock?.status === "ACTIVE",
      "I. Listing remains ACTIVE since remaining stock > 0"
    );

    // -----------------------------------------------------------------------
    // TEST J: User A cannot access User B's offers / request offers
    // -----------------------------------------------------------------------
    console.log("\n[Test J] Verifying cross-user isolation (IDOR / RLS)...");
    // Farmer B attempts to query Farmer A's direct offer
    const { data: unauthorizedOffer } = await farmerB.client
      .from("offers")
      .select("*")
      .eq("id", offerId);

    assert(
      !unauthorizedOffer || unauthorizedOffer.length === 0,
      "J. Farmer B cannot view Farmer A's listing offers (RLS isolation)"
    );

    // Farmer B attempts to query Farmer A's quote
    const { data: unauthorizedQuote } = await farmerB.client
      .from("request_offers")
      .select("*")
      .eq("id", quoteAId);

    // Note: farmer B did not submit quote A, and is not the buyer of request 1
    assert(
      !unauthorizedQuote || unauthorizedQuote.length === 0,
      "J. Farmer B cannot view Farmer A's quote on request (RLS isolation)"
    );

    // Farmer B attempts to withdraw Farmer A's quote
    await farmerB.client
      .from("request_offers")
      .update({ status: "WITHDRAWN" })
      .eq("id", quoteAId);

    const { data: verifyQuoteStillSafe } = await farmerA.client
      .from("request_offers")
      .select("status")
      .eq("id", quoteAId)
      .single();

    assert(
      verifyQuoteStillSafe?.status === "ACCEPTED",
      "J. Farmer B cannot modify or withdraw Farmer A's quotes"
    );

  } finally {
    // -----------------------------------------------------------------------
    // TEARDOWN: Clean up test artifacts in strict dependency order
    // -----------------------------------------------------------------------
    console.log("\n[Teardown] Cleaning up test records created during Pass 1 security suite...");

    // Orders cleanup
    for (const orderId of createdOrders) {
      await buyer.client.from("order_items").delete().eq("order_id", orderId);
      await buyer.client.from("order_status_history").delete().eq("order_id", orderId);
      await buyer.client.from("orders").delete().eq("id", orderId);
    }

    // Requests cleanup
    for (const reqId of createdRequests) {
      await buyer.client.from("request_offers").delete().eq("request_id", reqId);
      await buyer.client.from("buying_requests").delete().eq("id", reqId);
    }

    // Listings cleanup
    for (const lId of createdListings) {
      await farmerA.client.from("offers").delete().eq("listing_id", lId);
      await farmerA.client.from("listings").delete().eq("id", lId);
    }

    console.log("Teardown complete.\n");
  }

  console.log("=======================================================");
  console.log(` SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass1SecuritySuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
