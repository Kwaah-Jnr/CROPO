"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { failure, success, type ActionResult } from "@/lib/utils/action-result";
import { logServerError } from "@/lib/utils/errors";
import {
  farmSchema,
  farmerProfileSchema,
  listingSchema,
  listingStatusSchema,
  verificationSubmissionSchema,
  type ListingFormValues,
  type VerificationSubmissionFormValues,
} from "@/lib/validation/farmer";
import { farmerRequestOfferSchema } from "@/lib/validation/buyer";
import { echoValues, toFieldErrors } from "@/lib/validation/form-data";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_VERIFICATION_DOC_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_VERIFICATION_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10MB


export async function createListing(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure("You must be logged in as a registered Farmer to create produce listings.");
  }
  const farmerId = auth.profile.id;

  const rawValues = {
    crop_name: formData.get("crop_name"),
    variety: formData.get("variety") || "",
    category_id: formData.get("category_id"),
    farm_id: formData.get("farm_id") || "",
    quantity_available: formData.get("quantity_available"),
    unit: formData.get("unit"),
    price_per_unit: formData.get("price_per_unit"),
    grade: formData.get("grade"),
    harvest_date: formData.get("harvest_date") || "",
    available_date: formData.get("available_date") || "",
    region: formData.get("region"),
    city: formData.get("city") || "",
    description: formData.get("description") || "",
    delivery_available: formData.get("delivery_available") ? "true" : "false",
    status: formData.get("status") || "ACTIVE",
  };

  const parsed = listingSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const data: ListingFormValues = parsed.data;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Insert listing record
  const { data: inserted, error: insertError } = await db
    .from("listings")
    .insert({
      farmer_id: farmerId,
      farm_id: data.farm_id ? data.farm_id : null,
      category_id: data.category_id,
      crop_name: data.crop_name,
      variety: data.variety || null,
      quantity_available: data.quantity_available,
      unit: data.unit,
      price_per_unit: data.price_per_unit,
      currency: "GHS",
      grade: data.grade,
      harvest_date: data.harvest_date || null,
      available_date: data.available_date || null,
      region: data.region,
      city: data.city || null,
      description: data.description || null,
      delivery_available: data.delivery_available,
      status: data.status,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    logServerError("createListing", { code: insertError?.code, message: insertError?.message });
    return failure("Failed to save produce listing. Please try again.");
  }

  const listingId = inserted.id;

  // Process uploaded photos (if any)
  const files = formData.getAll("photos") as File[];
  let sortOrder = 0;

  for (const file of files) {
    if (!file || file.size === 0 || typeof file.arrayBuffer !== "function") continue;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      continue; // Skip invalid mime types
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      continue; // Skip files larger than 5MB
    }

    const ext = file.name.split(".").pop() || "jpg";
    const cleanFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${farmerId}/${listingId}/${cleanFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (!uploadError) {
      await db.from("listing_images").insert({
        listing_id: listingId,
        storage_path: storagePath,
        sort_order: sortOrder++,
        alt_text: `${data.crop_name} harvest photo`,
      });
    } else {
      logServerError("createListing:upload", { message: uploadError.message });
    }
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/listings");
  revalidatePath("/marketplace");
  revalidatePath("/");

  return success(undefined, "Produce listing published successfully.");
}

export async function updateListing(
  listingId: string,
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure(auth.error);
  }
  const farmerId = auth.profile.id;

  const rawValues = {
    crop_name: formData.get("crop_name"),
    variety: formData.get("variety") || "",
    category_id: formData.get("category_id"),
    farm_id: formData.get("farm_id") || "",
    quantity_available: formData.get("quantity_available"),
    unit: formData.get("unit"),
    price_per_unit: formData.get("price_per_unit"),
    grade: formData.get("grade"),
    harvest_date: formData.get("harvest_date") || "",
    available_date: formData.get("available_date") || "",
    region: formData.get("region"),
    city: formData.get("city") || "",
    description: formData.get("description") || "",
    delivery_available: formData.get("delivery_available") ? "true" : "false",
    status: formData.get("status") || "ACTIVE",
  };

  const parsed = listingSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const data: ListingFormValues = parsed.data;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Verify ownership
  const { data: existing } = await db
    .from("listings")
    .select("id, farmer_id")
    .eq("id", listingId)
    .single();

  if (!existing || existing.farmer_id !== farmerId) {
    return failure("You do not have permission to edit this listing.");
  }

  const { error: updateError } = await supabase.rpc("update_farmer_listing", {
    p_listing_id: listingId,
    p_expected_version: data.expected_version ?? undefined,
    p_farm_id: data.farm_id ? data.farm_id : undefined,
    p_category_id: data.category_id,
    p_crop_name: data.crop_name,
    p_variety: data.variety || undefined,
    p_quantity_available: data.quantity_available,
    p_unit: data.unit,
    p_price_per_unit: data.price_per_unit,
    p_grade: data.grade,
    p_harvest_date: data.harvest_date || undefined,
    p_available_date: data.available_date || undefined,
    p_region: data.region,
    p_city: data.city || undefined,
    p_description: data.description || undefined,
    p_delivery_available: data.delivery_available,
    p_status: data.status,
  });

  if (updateError) {
    if (
      updateError.code === "40001" ||
      updateError.code === "P0001" ||
      updateError.message?.includes("modified by another transaction")
    ) {
      return failure("This listing was updated by another transaction (such as a concurrent purchase). Please reload before saving.");
    }
    logServerError("updateListing", { code: updateError.code, message: updateError.message });
    return failure(updateError.message || "Failed to update produce listing. Please try again.");
  }

  // Process any newly added photos
  const files = formData.getAll("photos") as File[];
  const { data: currentImages } = await db
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1);

  let sortOrder = (currentImages?.[0]?.sort_order ?? -1) + 1;

  for (const file of files) {
    if (!file || file.size === 0 || typeof file.arrayBuffer !== "function") continue;
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) continue;
    if (file.size > MAX_IMAGE_SIZE_BYTES) continue;

    const ext = file.name.split(".").pop() || "jpg";
    const cleanFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${farmerId}/${listingId}/${cleanFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (!uploadError) {
      await db.from("listing_images").insert({
        listing_id: listingId,
        storage_path: storagePath,
        sort_order: sortOrder++,
        alt_text: `${data.crop_name} harvest photo`,
      });
    }
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/listings");
  revalidatePath(`/dashboard/farmer/listings/${listingId}/edit`);
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/");

  return success(undefined, "Produce listing updated successfully.");
}

export async function removeListing(listingId: string): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure(auth.error);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_farmer_listing", {
    p_listing_id: listingId,
  });

  if (error) {
    logServerError("removeListing", { code: error.code, message: error.message });
    return failure(error.message || "Failed to remove listing.");
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/listings");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/");

  return success(undefined, "Listing removed successfully.");
}

export async function updateListingStatus(listingId: string, newStatus: string): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure(auth.error);
  }
  const farmerId = auth.profile.id;

  const parsed = listingStatusSchema.safeParse({ status: newStatus });
  if (!parsed.success) {
    return failure("Invalid listing status.");
  }

  const supabase = await createClient();

  if (parsed.data.status === "REMOVED") {
    const { error } = await supabase.rpc("remove_farmer_listing", {
      p_listing_id: listingId,
    });

    if (error) {
      logServerError("updateListingStatus:remove", { code: error.code, message: error.message });
      return failure(error.message || "Failed to remove listing.");
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { error } = await db
      .from("listings")
      .update({ status: parsed.data.status })
      .eq("id", listingId)
      .eq("farmer_id", farmerId);

    if (error) {
      logServerError("updateListingStatus", { code: error.code, message: error.message });
      return failure("Failed to update status.");
    }
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/listings");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/");

  return success(undefined, `Listing status updated to ${parsed.data.status}.`);
}

export async function deleteListingImage(imageId: string, listingId: string): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure(auth.error);
  }
  const farmerId = auth.profile.id;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Verify image belongs to farmer's listing
  const { data: img } = await db
    .from("listing_images")
    .select("id, storage_path, listing_id")
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .single();

  if (!img) {
    return failure("Photo not found.");
  }

  const { data: listing } = await db
    .from("listings")
    .select("id, farmer_id")
    .eq("id", img.listing_id)
    .single();

  if (!listing || listing.farmer_id !== farmerId) {
    return failure("Unauthorized to remove this photo.");
  }

  // Delete from DB and storage
  await db.from("listing_images").delete().eq("id", imageId);
  await supabase.storage.from("listing-images").remove([img.storage_path]);

  revalidatePath(`/dashboard/farmer/listings/${listingId}/edit`);
  revalidatePath(`/marketplace/${listingId}`);

  return success(undefined, "Image removed successfully.");
}

export async function updateFarmerProfile(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure(auth.error);
  }
  const farmerId = auth.profile.id;

  const rawValues = {
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || "",
    region: formData.get("region") || "",
    city: formData.get("city") || "",
    bio: formData.get("bio") || "",
    years_farming: formData.get("years_farming") || "",
  };

  const parsed = farmerProfileSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please check your profile details.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const data = parsed.data;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Update base profile
  const { error: profileError } = await db
    .from("profiles")
    .update({
      full_name: data.full_name,
      phone: data.phone || null,
      region: data.region || null,
      city: data.city || null,
    })
    .eq("id", farmerId);

  if (profileError) {
    logServerError("updateFarmerProfile:base", { message: profileError.message });
    return failure("Failed to update profile information.");
  }

  // Update farmer extension
  const { error: farmerExtError } = await db
    .from("farmer_profiles")
    .update({
      bio: data.bio || null,
      years_farming: typeof data.years_farming === "number" ? data.years_farming : null,
    })
    .eq("profile_id", farmerId);

  if (farmerExtError) {
    logServerError("updateFarmerProfile:ext", { message: farmerExtError.message });
    return failure("Failed to update farming background details.");
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/profile");
  revalidatePath(`/farmers/${farmerId}`);

  return success(undefined, "Profile updated successfully.");
}

export async function saveFarm(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure(auth.error);
  }
  const farmerId = auth.profile.id;

  const rawValues = {
    id: formData.get("id") || "",
    name: formData.get("name"),
    region: formData.get("region"),
    district: formData.get("district") || "",
    community: formData.get("community") || "",
    size_hectares: formData.get("size_hectares") || "",
  };

  const parsed = farmSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please check your farm holding details.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const data = parsed.data;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  if (data.id) {
    // Update existing farm
    const { error } = await db
      .from("farms")
      .update({
        name: data.name,
        region: data.region,
        district: data.district || null,
        community: data.community || null,
        size_hectares: typeof data.size_hectares === "number" ? data.size_hectares : null,
      })
      .eq("id", data.id)
      .eq("farmer_id", farmerId);

    if (error) {
      logServerError("saveFarm:update", { message: error.message });
      return failure("Failed to update farm details.");
    }
  } else {
    // Insert new farm
    const { error } = await db.from("farms").insert({
      farmer_id: farmerId,
      name: data.name,
      region: data.region,
      district: data.district || null,
      community: data.community || null,
      size_hectares: typeof data.size_hectares === "number" ? data.size_hectares : null,
    });

    if (error) {
      logServerError("saveFarm:insert", { message: error.message });
      return failure("Failed to save new farm holding.");
    }
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/profile");
  revalidatePath("/dashboard/farmer/listings/new");

  return success(undefined, "Farm holding saved successfully.");
}

export async function acceptOffer(offerId: string): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure("Please sign in as a registered Farmer to respond to offers.");
  }

  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc("accept_offer_and_create_order", {
    p_offer_id: offerId,
  });

  const orderResult = result as { order_id: string; order_number: string } | null;

  if (error || !orderResult) {
    logServerError("acceptOffer", { message: error?.message });
    return failure(error?.message || "Failed to accept offer.");
  }

  revalidatePath("/dashboard/farmer/offers");
  revalidatePath("/dashboard/farmer/orders");
  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/buyer/offers");
  revalidatePath("/dashboard/buyer/orders");

  return success(
    { orderId: orderResult.order_id, orderNumber: orderResult.order_number },
    `Offer accepted! Order ${orderResult.order_number} created.`
  );
}

export async function rejectOffer(offerId: string): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure("Please sign in to decline offers.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("offers")
    .update({ status: "REJECTED", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("farmer_id", auth.profile.id)
    .eq("status", "PENDING");

  if (error) {
    logServerError("rejectOffer", { message: error.message });
    return failure("Failed to decline offer.");
  }

  revalidatePath("/dashboard/farmer/offers");
  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/buyer/offers");

  return success(undefined, "Offer declined.");
}

export async function submitFarmerRequestOffer(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const auth = await authorize("FARMER");
  if (!auth.ok) {
    return failure("Please sign in as a registered Farmer to submit produce quotes.");
  }
  const farmerId = auth.profile.id;

  const rawValues = {
    request_id: formData.get("request_id") as string,
    listing_id: (formData.get("listing_id") as string) || "",
    quantity: formData.get("quantity"),
    price_per_unit: formData.get("price_per_unit"),
    available_date: formData.get("available_date") || "",
    message: formData.get("message") || "",
  };

  const parsed = farmerRequestOfferSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please check quote details.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const data = parsed.data;
  const supabase = await createClient();

  // Insert response
  const { error } = await supabase.from("request_offers").insert({
    request_id: data.request_id,
    farmer_id: farmerId,
    listing_id: data.listing_id || null,
    quantity: data.quantity,
    price_per_unit: data.price_per_unit,
    available_date: data.available_date || null,
    message: data.message || null,
    status: "PENDING",
  });

  if (error) {
    logServerError("submitFarmerRequestOffer", { message: error.message });
    return failure(
      error.code === "23505"
        ? "You have already submitted a pending quote for this buying request."
        : "Failed to submit quote. Please try again."
    );
  }

  revalidatePath("/dashboard/buyer/requests");
  revalidatePath("/dashboard/farmer");

  return success(undefined, "Your quote was submitted to the buyer.");
}

export async function submitFarmerVerification(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult<{ submissionId: string }>> {
  const auth = await authorize("FARMER");

  if (!auth.ok) {
    return failure("You must be signed in as a registered Farmer to submit verification.");
  }
  const farmerId = auth.profile.id;

  const rawValues = {
    type: formData.get("type") as string,
    farm_id: (formData.get("farm_id") as string) || "",
    notes: (formData.get("notes") as string) || "",
  };

  const parsed = verificationSubmissionSchema.safeParse(rawValues);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(rawValues as Record<string, string | undefined>),
    });
  }

  const data: VerificationSubmissionFormValues = parsed.data;
  const files = (formData.getAll("documents") as File[]).filter(
    (f) => f && f.size > 0 && typeof f.arrayBuffer === "function"
  );

  if (files.length === 0) {
    return failure(
      "At least one verification document is required (e.g. Ghana Card, Land Title, or Indenture)."
    );
  }

  if (files.length > 5) {
    return failure("You may upload a maximum of 5 verification documents per submission.");
  }

  // Validate all files before uploading
  for (const file of files) {
    if (!ALLOWED_VERIFICATION_DOC_MIME_TYPES.includes(file.type)) {
      return failure(
        `File "${file.name}" is not an accepted format. Please upload PDF, JPEG, PNG, or WEBP.`
      );
    }
    if (file.size > MAX_VERIFICATION_DOC_SIZE_BYTES) {
      return failure(`File "${file.name}" exceeds the 10MB file size limit.`);
    }
  }

  const supabase = await createClient();

  // If submitting FARM verification, verify farm ownership
  if (data.type === "FARM" && data.farm_id) {
    const { data: farm } = await supabase
      .from("farms")
      .select("id, farmer_id")
      .eq("id", data.farm_id)
      .single();

    if (!farm || farm.farmer_id !== farmerId) {
      return failure("You are not authorized to submit verification for this farm.");
    }
  }

  // Upload files to private verification-documents bucket under farmer's folder
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const sanitizedBase = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const storagePath = `${farmerId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}_${sanitizedBase}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logServerError("submitFarmerVerification:upload", { message: uploadError.message });
      // Clean up already uploaded files from this batch
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("verification-documents").remove(uploadedPaths);
      }
      return failure(`Failed to upload "${file.name}". Please try again.`);
    }

    uploadedPaths.push(storagePath);
  }

  // Insert submission row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: inserted, error: insertError } = await db
    .from("verification_submissions")
    .insert({
      profile_id: farmerId,
      farm_id: data.type === "FARM" ? data.farm_id : null,
      type: data.type,
      document_paths: uploadedPaths,
      notes: data.notes || null,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (insertError) {
    logServerError("submitFarmerVerification:insert", {
      code: insertError.code,
      message: insertError.message,
    });
    // Clean up uploaded files
    await supabase.storage.from("verification-documents").remove(uploadedPaths);

    if (insertError.code === "23505") {
      return failure(
        "You already have a pending verification submission for this item under review."
      );
    }
    return failure("Failed to save verification submission. Please try again.");
  }

  revalidatePath("/dashboard/farmer/verification");
  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/profile");

  return success(
    { submissionId: inserted.id },
    "Verification submission received! Our operations team will review your documentation."
  );
}

export async function getVerificationDocumentSignedUrl(
  path: string
): Promise<ActionResult<{ signedUrl: string }>> {
  const auth = await authorize(["FARMER", "ADMIN"]);
  if (!auth.ok) {
    return failure("Unauthorized to view verification documents.");
  }

  // Non-admins can only view documents in their own folder
  if (auth.profile.role !== "ADMIN") {
    const ownerFolder = path.split("/")[0];
    if (ownerFolder !== auth.profile.id) {
      return failure("Unauthorized access to this document.");
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("verification-documents")
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    logServerError("getVerificationDocumentSignedUrl", { message: error?.message });
    return failure("Failed to generate secure document link.");
  }

  return success({ signedUrl: data.signedUrl });
}


