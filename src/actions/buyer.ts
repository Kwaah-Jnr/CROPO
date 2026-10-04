"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { failure, success, type ActionResult } from "@/lib/utils/action-result";
import { logServerError } from "@/lib/utils/errors";
import {
  buyerProfileSchema,
  buyingRequestSchema,
  buyNowSchema,
  makeOfferSchema,
} from "@/lib/validation/buyer";
import { echoValues, toFieldErrors } from "@/lib/validation/form-data";
import type { Database } from "@/types/database.types";

export async function makeOffer(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("You must be signed in as a registered Buyer to make an offer.");
  }
  const buyerId = auth.profile.id;

  const rawValues = {
    listing_id: formData.get("listing_id") as string,
    quantity: formData.get("quantity"),
    price_per_unit: formData.get("price_per_unit"),
    message: formData.get("message") || "",
  };

  const parsed = makeOfferSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const supabase = await createClient();

  // Validate listing exists and is active
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, farmer_id, quantity_available, status, crop_name")
    .eq("id", parsed.data.listing_id)
    .single();

  if (listingError || !listing || listing.status !== "ACTIVE") {
    return failure("This produce listing is no longer available for offers.");
  }

  if (listing.farmer_id === buyerId) {
    return failure("You cannot make an offer on your own produce listing.");
  }

  if (parsed.data.quantity > listing.quantity_available) {
    return failure(
      `Offered volume cannot exceed available stock (${listing.quantity_available}).`
    );
  }

  const { error: insertError } = await supabase.from("offers").insert({
    listing_id: parsed.data.listing_id,
    buyer_id: buyerId,
    farmer_id: listing.farmer_id,
    quantity: parsed.data.quantity,
    price_per_unit: parsed.data.price_per_unit,
    message: parsed.data.message || null,
    status: "PENDING",
  });

  if (insertError) {
    logServerError("makeOffer", { message: insertError.message });
    return failure("Could not submit your offer. Please try again.");
  }

  revalidatePath("/dashboard/buyer/offers");
  revalidatePath("/dashboard/buyer");
  revalidatePath("/dashboard/farmer/offers");
  revalidatePath(`/marketplace/${parsed.data.listing_id}`);

  return success(undefined, "Your offer was submitted to the farmer.");
}

export async function withdrawOffer(offerId: string): Promise<ActionResult> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("Please sign in to manage your offers.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("offers")
    .update({ status: "WITHDRAWN", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("buyer_id", auth.profile.id)
    .eq("status", "PENDING");

  if (error) {
    logServerError("withdrawOffer", { message: error.message });
    return failure("Could not withdraw offer. It may have already been responded to.");
  }

  revalidatePath("/dashboard/buyer/offers");
  revalidatePath("/dashboard/buyer");
  return success(undefined, "Offer successfully withdrawn.");
}

export async function createBuyNowOrder(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("Please sign in as a registered Buyer to place Buy Now orders.");
  }

  const rawValues = {
    listing_id: formData.get("listing_id") as string,
    quantity: formData.get("quantity"),
    delivery_method: (formData.get("delivery_method") as string) || "PICKUP",
    delivery_address: formData.get("delivery_address") || "",
    notes: formData.get("notes") || "",
  };

  const parsed = buyNowSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please check order details.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("create_buy_now_order", {
    p_listing_id: parsed.data.listing_id,
    p_quantity: parsed.data.quantity,
    p_delivery_method: parsed.data.delivery_method,
    p_delivery_address: parsed.data.delivery_address || undefined,
    p_notes: parsed.data.notes || undefined,
  });

  const orderResult = result as { order_id: string; order_number: string } | null;

  if (error || !orderResult) {
    logServerError("createBuyNowOrder", { message: error?.message });
    return failure(error?.message || "Failed to initiate Buy Now order.");
  }

  revalidatePath("/dashboard/buyer/orders");
  revalidatePath("/dashboard/buyer");
  revalidatePath("/dashboard/farmer/orders");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${parsed.data.listing_id}`);

  return success(
    { orderId: orderResult.order_id, orderNumber: orderResult.order_number },
    `Order ${orderResult.order_number} initiated successfully.`
  );
}

export async function createBuyingRequest(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("Please sign in as a registered Buyer to post buying requests.");
  }
  const buyerId = auth.profile.id;

  const rawValues = {
    crop_name: formData.get("crop_name"),
    category_id: formData.get("category_id") || "",
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    desired_grade: formData.get("desired_grade") || "",
    destination_region: formData.get("destination_region"),
    destination_city: formData.get("destination_city") || "",
    required_by: formData.get("required_by") || "",
    target_price_per_unit: formData.get("target_price_per_unit") || "",
    description: formData.get("description") || "",
  };

  const parsed = buyingRequestSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("buying_requests").insert({
    buyer_id: buyerId,
    crop_name: data.crop_name,
    category_id: data.category_id || null,
    quantity: data.quantity,
    unit: data.unit,
    desired_grade: data.desired_grade ? (data.desired_grade as Database["public"]["Enums"]["produce_grade"]) : null,
    destination_region: data.destination_region,
    destination_city: data.destination_city || null,
    required_by: data.required_by || null,
    target_price_per_unit: data.target_price_per_unit ? Number(data.target_price_per_unit) : null,
    currency: "GHS",
    description: data.description || null,
    status: "OPEN",
  });

  if (error) {
    logServerError("createBuyingRequest", { message: error.message });
    return failure("Could not publish your buying request. Please try again.");
  }

  revalidatePath("/dashboard/buyer/requests");
  revalidatePath("/dashboard/buyer");

  return success(undefined, "Buying request published. Verified farmers will be notified.");
}

export async function cancelBuyingRequest(requestId: string): Promise<ActionResult> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("Please sign in to manage buying requests.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("buying_requests")
    .update({ status: "CANCELLED" })
    .eq("id", requestId)
    .eq("buyer_id", auth.profile.id)
    .eq("status", "OPEN");

  if (error) {
    logServerError("cancelBuyingRequest", { message: error.message });
    return failure("Could not cancel buying request.");
  }

  revalidatePath("/dashboard/buyer/requests");
  revalidatePath("/dashboard/buyer");
  return success(undefined, "Buying request cancelled.");
}

export async function acceptFarmerRequestOffer(
  requestOfferId: string
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("Please sign in to accept offers.");
  }

  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc(
    "accept_request_offer_and_create_order",
    {
      p_request_offer_id: requestOfferId,
    }
  );

  const orderResult = result as { order_id: string; order_number: string } | null;

  if (error || !orderResult) {
    logServerError("acceptFarmerRequestOffer", { message: error?.message });
    return failure(error?.message || "Failed to accept quote and create order.");
  }

  revalidatePath("/dashboard/buyer/orders");
  revalidatePath("/dashboard/buyer/requests");
  revalidatePath("/dashboard/buyer");
  revalidatePath("/dashboard/farmer/orders");

  return success(
    { orderId: orderResult.order_id, orderNumber: orderResult.order_number },
    `Quote accepted! Order ${orderResult.order_number} created.`
  );
}

export async function rejectFarmerRequestOffer(requestOfferId: string): Promise<ActionResult> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("Please sign in to decline offers.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("request_offers")
    .update({ status: "REJECTED", responded_at: new Date().toISOString() })
    .eq("id", requestOfferId)
    .eq("status", "PENDING");

  if (error) {
    logServerError("rejectFarmerRequestOffer", { message: error.message });
    return failure("Failed to decline offer.");
  }

  revalidatePath("/dashboard/buyer/requests");
  return success(undefined, "Supplier quote declined.");
}

export async function updateBuyerProfile(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure(auth.error);
  }
  const buyerId = auth.profile.id;

  const rawValues = {
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || "",
    business_name: formData.get("business_name") || "",
    business_type: formData.get("business_type") || "RETAILER",
    region: formData.get("region") || "",
    city: formData.get("city") || "",
  };

  const parsed = buyerProfileSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const { full_name, phone, business_name, business_type, region, city } = parsed.data;
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone: phone || null,
      region: region || null,
      city: city || null,
    })
    .eq("id", buyerId);

  if (profileError) {
    logServerError("updateBuyerProfile:base", { message: profileError.message });
    return failure("Failed to update profile.");
  }

  const { error: buyerExtError } = await supabase
    .from("buyer_profiles")
    .update({
      business_name: business_name || null,
      business_type: business_type as Database["public"]["Enums"]["business_type"],
    })
    .eq("profile_id", buyerId);

  if (buyerExtError) {
    logServerError("updateBuyerProfile:ext", { message: buyerExtError.message });
    return failure("Failed to update business details.");
  }

  revalidatePath("/dashboard/buyer");
  revalidatePath("/dashboard/buyer/profile");

  return success(undefined, "Business profile updated successfully.");
}

export async function toggleSavedSupplier(farmerId: string): Promise<ActionResult<{ saved: boolean }>> {
  const auth = await authorize("BUYER");
  if (!auth.ok) {
    return failure("Sign in as a Buyer to save suppliers.");
  }
  const buyerId = auth.profile.id;

  const supabase = await createClient();

  // Check if exists
  const { data: existing } = await supabase
    .from("saved_suppliers")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("farmer_id", farmerId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_suppliers").delete().eq("id", existing.id);
    revalidatePath("/dashboard/buyer/suppliers");
    return success({ saved: false }, "Farmer removed from saved suppliers.");
  } else {
    await supabase.from("saved_suppliers").insert({
      buyer_id: buyerId,
      farmer_id: farmerId,
    });
    revalidatePath("/dashboard/buyer/suppliers");
    return success({ saved: true }, "Farmer saved to your suppliers directory.");
  }
}
