"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { failure, success, type ActionResult } from "@/lib/utils/action-result";
import { logServerError } from "@/lib/utils/errors";
import {
  farmSchema,
  farmerProfileSchema,
  listingSchema,
  listingStatusSchema,
  type ListingFormValues,
} from "@/lib/validation/farmer";
import { echoValues, toFieldErrors } from "@/lib/validation/form-data";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function createListing(_prev: unknown, formData: FormData): Promise<ActionResult> {
  let farmerId: string;
  try {
    const profile = await requireRole("FARMER");
    farmerId = profile.id;
  } catch {
    return failure("You must be logged in as a registered Farmer to create produce listings.");
  }

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

  redirect("/dashboard/farmer/listings");
}

export async function updateListing(
  listingId: string,
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  let farmerId: string;
  try {
    const profile = await requireRole("FARMER");
    farmerId = profile.id;
  } catch {
    return failure("Unauthorized");
  }

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

  const { error: updateError } = await db
    .from("listings")
    .update({
      farm_id: data.farm_id ? data.farm_id : null,
      category_id: data.category_id,
      crop_name: data.crop_name,
      variety: data.variety || null,
      quantity_available: data.quantity_available,
      unit: data.unit,
      price_per_unit: data.price_per_unit,
      grade: data.grade,
      harvest_date: data.harvest_date || null,
      available_date: data.available_date || null,
      region: data.region,
      city: data.city || null,
      description: data.description || null,
      delivery_available: data.delivery_available,
      status: data.status,
    })
    .eq("id", listingId)
    .eq("farmer_id", farmerId);

  if (updateError) {
    logServerError("updateListing", { code: updateError.code, message: updateError.message });
    return failure("Failed to update produce listing. Please try again.");
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

  redirect("/dashboard/farmer/listings");
}

export async function updateListingStatus(listingId: string, newStatus: string): Promise<ActionResult> {
  let farmerId: string;
  try {
    const profile = await requireRole("FARMER");
    farmerId = profile.id;
  } catch {
    return failure("Unauthorized");
  }

  const parsed = listingStatusSchema.safeParse({ status: newStatus });
  if (!parsed.success) {
    return failure("Invalid listing status.");
  }

  const supabase = await createClient();
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

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/farmer/listings");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${listingId}`);

  return success(undefined, `Listing status updated to ${parsed.data.status}.`);
}

export async function deleteListingImage(imageId: string, listingId: string): Promise<ActionResult> {
  let farmerId: string;
  try {
    const profile = await requireRole("FARMER");
    farmerId = profile.id;
  } catch {
    return failure("Unauthorized");
  }

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
  let farmerId: string;
  try {
    const profile = await requireRole("FARMER");
    farmerId = profile.id;
  } catch {
    return failure("Unauthorized");
  }

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
  let farmerId: string;
  try {
    const profile = await requireRole("FARMER");
    farmerId = profile.id;
  } catch {
    return failure("Unauthorized");
  }

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
