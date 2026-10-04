import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  buyingRequestSchema,
  makeOfferSchema,
  buyNowSchema,
  buyerProfileSchema,
  farmerRequestOfferSchema,
} from "../src/lib/validation/buyer";
import { ORDER_STATUSES, OrderStatus } from "../src/lib/constants";

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

async function runPhase5Verification() {
  console.log("\n=================================================================");
  console.log(" CROPO PHASE 5 — COMMERCIAL BUYER, OFFERS & ORDER FLOW TEST SUITE");
  console.log("=================================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // -------------------------------------------------------------------------
  // 1. Zod Validation Schemas for Buyer Actions
  // -------------------------------------------------------------------------
  console.log("[1] Testing Buyer Action Validation Schemas...");

  // 1.1 Buying Request (RFQ) Validation
  const validRFQ = {
    crop_name: "Yellow Maize",
    quantity: 100,
    unit: "BAG" as const,
    desired_grade: "A" as const,
    destination_region: "Greater Accra",
    destination_city: "Tema Harbor",
    required_by: "2026-11-01",
    target_price_per_unit: 250.0,
    description: "Export grain batch required with moisture level below 13%.",
  };
  const rfqRes = buyingRequestSchema.safeParse(validRFQ);
  assert(rfqRes.success, "Valid RFQ payload passes schema validation");

  const invalidRFQVol = buyingRequestSchema.safeParse({ ...validRFQ, quantity: -10 });
  assert(!invalidRFQVol.success, "Rejects negative RFQ volume");

  const invalidRFQRegion = buyingRequestSchema.safeParse({ ...validRFQ, destination_region: "Berlin" });
  assert(!invalidRFQRegion.success, "Rejects non-Ghanaian destination region");

  // 1.2 Make Offer Validation
  const validOffer = {
    listing_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 50,
    price_per_unit: 180,
    message: "Seeking bulk commercial discount for 50 bags.",
  };
  const offerRes = makeOfferSchema.safeParse(validOffer);
  assert(offerRes.success, "Valid Make Offer payload passes schema validation");

  const invalidOfferPrice = makeOfferSchema.safeParse({ ...validOffer, price_per_unit: 0 });
  assert(!invalidOfferPrice.success, "Rejects zero price_per_unit in Make Offer");

  // 1.3 Buy Now Validation
  const validBuyNowPickup = {
    listing_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 20,
    delivery_method: "PICKUP" as const,
    notes: "Will send our truck on Wednesday morning.",
  };
  const buyNowRes1 = buyNowSchema.safeParse(validBuyNowPickup);
  assert(buyNowRes1.success, "Valid Buy Now with PICKUP passes schema");

  const validBuyNowDelivery = {
    listing_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 20,
    delivery_method: "DELIVERY" as const,
    delivery_address: "Plot 42, Heavy Industrial Area, Tema",
    notes: "Deliver before 4 PM",
  };
  const buyNowRes2 = buyNowSchema.safeParse(validBuyNowDelivery);
  assert(buyNowRes2.success, "Valid Buy Now with DELIVERY passes schema");

  const invalidBuyNowMissingAddr = buyNowSchema.safeParse({
    listing_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 20,
    delivery_method: "DELIVERY" as const,
    delivery_address: "",
  });
  assert(!invalidBuyNowMissingAddr.success, "Buy Now rejects DELIVERY method without delivery_address");

  // 1.4 Buyer Profile Validation
  const validBuyerProfile = {
    full_name: "Ama Serwaa",
    phone: "0244123456",
    business_name: "Golden Stool Supermarkets",
    business_type: "RETAILER" as const,
    region: "Greater Accra",
    city: "Accra",
  };
  const profileRes = buyerProfileSchema.safeParse(validBuyerProfile);
  assert(profileRes.success, "Valid buyer profile passes schema");

  const invalidPhone = buyerProfileSchema.safeParse({ ...validBuyerProfile, phone: "555-1234" });
  assert(!invalidPhone.success, "Rejects invalid phone format");

  // 1.5 Farmer Request Offer (Quote) Validation
  const validQuote = {
    request_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 100,
    price_per_unit: 240,
    available_date: "2026-10-25",
    message: "Grade A maize dried and bagged ready for collection.",
  };
  const quoteRes = farmerRequestOfferSchema.safeParse(validQuote);
  assert(quoteRes.success, "Valid farmer quote passes schema");

  // -------------------------------------------------------------------------
  // 2. 11-State Order Architecture Invariants
  // -------------------------------------------------------------------------
  console.log("\n[2] Verifying 11-State Order Architecture...");

  const expectedStates = [
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

  assert(ORDER_STATUSES.length === 11, "ORDER_STATUSES contains exactly 11 lifecycle states");

  const hasAllStates = expectedStates.every((s) => ORDER_STATUSES.includes(s as OrderStatus));
  assert(hasAllStates, "ORDER_STATUSES covers all 11 required lifecycle states");

  // -------------------------------------------------------------------------
  // 3. Security & RLS Policy Verification: Anonymous / Unauthorized Restrictions
  // -------------------------------------------------------------------------
  console.log("\n[3] Testing Anonymous / Unauthorized Access Restrictions (RLS)...");

  // 3.1 Buying Requests read/write protection
  const { data: anonRfqRead, error: anonRfqReadErr } = await anonClient
    .from("buying_requests")
    .select("*");
  assert(
    anonRfqReadErr !== null || (anonRfqRead?.length ?? 0) === 0,
    "Anonymous users cannot read 'buying_requests' table (RLS enforced)"
  );

  const { error: anonRfqInsertErr } = await anonClient
    .from("buying_requests")
    .insert([
      {
        buyer_id: "00000000-0000-0000-0000-000000000001",
        crop_name: "Illegal Cassava",
        quantity: 10,
        unit: "BAG",
        destination_region: "Ashanti",
      },
    ]);
  assert(anonRfqInsertErr !== null, "Anonymous users cannot insert into 'buying_requests' (RLS write blocked)");

  // 3.2 Request Offers (Farmer quotes) protection
  const { data: anonQuotes, error: anonQuoteErr } = await anonClient
    .from("request_offers")
    .select("*");
  assert(
    anonQuoteErr !== null || (anonQuotes?.length ?? 0) === 0,
    "Anonymous users cannot read 'request_offers' table (RLS enforced)"
  );

  const { error: anonQuoteInsertErr } = await anonClient
    .from("request_offers")
    .insert([
      {
        request_id: "00000000-0000-0000-0000-000000000001",
        farmer_id: "00000000-0000-0000-0000-000000000002",
        quantity: 10,
        price_per_unit: 50,
      },
    ]);
  assert(anonQuoteInsertErr !== null, "Anonymous users cannot insert into 'request_offers' (RLS write blocked)");

  // 3.3 Offers (Listing negotiation) protection
  const { data: anonOffers, error: anonOfferErr } = await anonClient
    .from("offers")
    .select("*");
  assert(
    anonOfferErr !== null || (anonOffers?.length ?? 0) === 0,
    "Anonymous users cannot read 'offers' table (RLS enforced)"
  );

  const { error: anonOfferInsertErr } = await anonClient
    .from("offers")
    .insert([
      {
        listing_id: "00000000-0000-0000-0000-000000000001",
        buyer_id: "00000000-0000-0000-0000-000000000001",
        farmer_id: "00000000-0000-0000-0000-000000000002",
        quantity: 10,
        price_per_unit: 50,
      },
    ]);
  assert(anonOfferInsertErr !== null, "Anonymous users cannot insert into 'offers' (RLS write blocked)");

  // 3.4 Saved Suppliers protection
  const { data: anonSavedSuppliers, error: anonSavedSuppliersErr } = await anonClient
    .from("saved_suppliers")
    .select("*");
  assert(
    anonSavedSuppliersErr !== null || (anonSavedSuppliers?.length ?? 0) === 0,
    "Anonymous users cannot read 'saved_suppliers' table (RLS enforced)"
  );

  const { error: anonSaveInsertErr } = await anonClient
    .from("saved_suppliers")
    .insert([
      {
        buyer_id: "00000000-0000-0000-0000-000000000001",
        farmer_id: "00000000-0000-0000-0000-000000000002",
      },
    ]);
  assert(anonSaveInsertErr !== null, "Anonymous users cannot insert into 'saved_suppliers' (RLS write blocked)");

  // 3.5 Buyer Profiles protection
  const { data: anonBuyerProfiles, error: anonBuyerProfilesErr } = await anonClient
    .from("buyer_profiles")
    .select("*");
  assert(
    anonBuyerProfilesErr !== null || (anonBuyerProfiles?.length ?? 0) === 0,
    "Anonymous users cannot query 'buyer_profiles' directly (RLS enforced)"
  );

  // -------------------------------------------------------------------------
  // 4. Order Creation Boundaries & RPC Security Definer Verification
  // -------------------------------------------------------------------------
  console.log("\n[4] Testing Order Creation Boundaries & Atomic RPC Protection...");

  // Direct insert into orders MUST be rejected (client has no raw INSERT grant)
  const { error: directOrderInsertErr } = await anonClient
    .from("orders")
    .insert([
      {
        order_number: "CRP-FAKE-001",
        buyer_id: "00000000-0000-0000-0000-000000000001",
        farmer_id: "00000000-0000-0000-0000-000000000002",
        source: "BUY_NOW",
        status: "PENDING",
        subtotal: 1000,
        currency: "GHS",
        delivery_method: "BUYER_PICKUP",
      },
    ]);
  assert(
    directOrderInsertErr !== null,
    "Direct raw client insertion into 'orders' table is denied (must use RPC functions)"
  );

  // Direct insert into order_items MUST be rejected
  const { error: directItemInsertErr } = await anonClient
    .from("order_items")
    .insert([
      {
        order_id: "00000000-0000-0000-0000-000000000001",
        listing_id: "00000000-0000-0000-0000-000000000001",
        crop_name: "Illegal Corn",
        quantity: 10,
        unit: "BAG",
        price_per_unit: 100,
        line_total: 1000,
      },
    ]);
  assert(
    directItemInsertErr !== null,
    "Direct raw client insertion into 'order_items' table is denied"
  );

  // Calling create_buy_now_order anonymously must be rejected
  const { error: anonRpcErr } = await anonClient.rpc("create_buy_now_order", {
    p_listing_id: "00000000-0000-0000-0000-000000000001",
    p_quantity: 10,
    p_delivery_method: "BUYER_PICKUP",
    p_delivery_address: null,
    p_notes: null,
  });
  assert(
    anonRpcErr !== null,
    "create_buy_now_order RPC rejects unauthenticated / non-buyer callers",
    anonRpcErr?.message
  );

  // Calling accept_offer_and_create_order anonymously must be rejected
  const { error: anonAcceptOfferErr } = await anonClient.rpc("accept_offer_and_create_order", {
    p_offer_id: "00000000-0000-0000-0000-000000000001",
  });
  assert(
    anonAcceptOfferErr !== null,
    "accept_offer_and_create_order RPC rejects unauthenticated callers",
    anonAcceptOfferErr?.message
  );

  // Calling accept_request_offer_and_create_order anonymously must be rejected
  const { error: anonAcceptRequestOfferErr } = await anonClient.rpc(
    "accept_request_offer_and_create_order",
    {
      p_request_offer_id: "00000000-0000-0000-0000-000000000001",
    }
  );
  assert(
    anonAcceptRequestOfferErr !== null,
    "accept_request_offer_and_create_order RPC rejects unauthenticated callers",
    anonAcceptRequestOfferErr?.message
  );

  // -------------------------------------------------------------------------
  // 5. Privacy & Data Protection Boundaries
  // -------------------------------------------------------------------------
  console.log("\n[5] Testing Privacy and Commercial Protection Boundaries...");

  // Orders history must be unreadable by anon
  const { data: anonHistory, error: anonHistoryErr } = await anonClient
    .from("order_status_history")
    .select("*");
  assert(
    anonHistoryErr !== null || (anonHistory?.length ?? 0) === 0,
    "order_status_history is protected and private to involved order parties"
  );

  // Farmer phone numbers and private IDs must never be readable from public listings
  const { data: publicListings } = await anonClient
    .from("listings")
    .select("id, crop_name, profiles(id, full_name, phone)")
    .limit(1);

  const phoneExposed = ((publicListings as unknown as Array<{ profiles?: Array<{ phone?: string | null }> | null }>) || []).some((l) => (l.profiles || []).some((p) => Boolean(p?.phone)));
  assert(
    !phoneExposed,
    "Public listing queries do not leak farmer telephone numbers or private credentials"
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(` PHASE 5 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Verification().catch((err) => {
  console.error("Phase 5 verification suite encountered an unexpected error:", err);
  process.exit(1);
});
