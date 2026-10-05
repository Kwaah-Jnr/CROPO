import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";
import { formatProduceImageUrl } from "@/lib/utils/image";
import type { Database } from "@/types/database.types";


export type FarmerDashboardOverview = {
  activeListingsCount: number;
  totalListingsCount: number;
  pendingOffersCount: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  totalRevenue: number;
  pendingOrderValue: number;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  farmName: string | null;
  recentListings: Array<{
    id: string;
    crop_name: string;
    variety: string | null;
    category_name: string;
    quantity_available: number;
    unit: string;
    price_per_unit: number;
    grade: string;
    status: string;
    created_at: string;
    image_url: string | null;
  }>;
  recentOffers: Array<{
    id: string;
    listing_id: string;
    crop_name: string;
    buyer_name: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    status: string;
    created_at: string;
  }>;
  recentOrders: Array<{
    id: string;
    order_number: string;
    crop_name: string;
    quantity: number;
    unit: string;
    subtotal: number;
    status: string;
    delivery_method: string;
    created_at: string;
  }>;
};

type DbListingRow = {
  id: string;
  crop_name: string;
  variety: string | null;
  category_id?: string;
  farm_id?: string | null;
  quantity_available: number;
  unit: string;
  price_per_unit: number;
  currency?: string;
  grade: "A" | "B" | "C" | "UNGRADED";
  harvest_date?: string | null;
  available_date?: string | null;
  region?: string;
  city?: string | null;
  description?: string | null;
  delivery_available?: boolean;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT" | "REMOVED";
  version?: number;
  created_at: string;
  crop_categories: { name: string; slug?: string } | null;
  farms?: { name: string } | null;
  listing_images: Array<{ id?: string; storage_path: string; sort_order: number }> | null;
};

type DbOfferRow = {
  id: string;
  listing_id: string;
  quantity: number;
  price_per_unit: number;
  message: string | null;
  status: string;
  responded_at: string | null;
  created_at: string;
  listings: {
    id?: string;
    crop_name: string;
    unit: string;
    price_per_unit?: number;
    city?: string | null;
    region?: string;
  } | null;
  buyer_profiles: {
    business_name: string | null;
    business_type?: string | null;
    profiles: {
      full_name: string;
      city?: string | null;
      region?: string | null;
    } | null;
  } | null;
};

type DbOrderRow = {
  id: string;
  order_number: string;
  source: "BUY_NOW" | "OFFER" | "REQUEST";
  status: string;
  subtotal: number;
  currency: string;
  delivery_method: string;
  delivery_address: string | null;
  notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  buyer_profiles: {
    business_name: string | null;
    profiles: {
      full_name: string;
      phone: string | null;
      city: string | null;
      region: string | null;
    } | null;
  } | null;
  order_items: Array<{
    id: string;
    crop_name: string;
    unit: string;
    quantity: number;
    price_per_unit: number;
    line_total: number;
  }> | null;
};

export async function getFarmerDashboardOverview(userId: string): Promise<FarmerDashboardOverview> {
  const supabase = await createClient();

  // 1. Farmer profile & verification
  const { data: rawProfile } = await supabase
    .from("farmer_profiles")
    .select("verification_status")
    .eq("profile_id", userId)
    .maybeSingle();

  const farmerProfile = rawProfile as unknown as { verification_status: string } | null;

  const { data: rawFarms } = await supabase
    .from("farms")
    .select("name")
    .eq("farmer_id", userId)
    .limit(1);

  const farms = rawFarms as unknown as Array<{ name: string }> | null;
  const primaryFarmName = farms?.[0]?.name ?? null;

  // 2. Listings metrics
  const { data: rawListings } = await supabase
    .from("listings")
    .select(`
      id,
      crop_name,
      variety,
      quantity_available,
      unit,
      price_per_unit,
      grade,
      status,
      created_at,
      crop_categories (name),
      listing_images (storage_path, sort_order)
    `)
    .eq("farmer_id", userId)
    .neq("status", "REMOVED")
    .order("created_at", { ascending: false });

  const listingsList = (rawListings as unknown as DbListingRow[]) || [];
  const activeListings = listingsList.filter((l) => l.status === "ACTIVE");

  const recentListings = listingsList.slice(0, 4).map((l) => {
    const cat = l.crop_categories;
    const imgs = l.listing_images || [];
    const firstImg = formatProduceImageUrl(imgs.sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path);

    return {
      id: l.id,
      crop_name: l.crop_name,
      variety: l.variety,
      category_name: cat?.name || "General Produce",
      quantity_available: Number(l.quantity_available),
      unit: l.unit,
      price_per_unit: Number(l.price_per_unit),
      grade: l.grade,
      status: l.status,
      created_at: l.created_at,
      image_url: firstImg,
    };
  });

  // 3. Offers metrics
  const { data: rawOffers } = await supabase
    .from("offers")
    .select(`
      id,
      listing_id,
      quantity,
      price_per_unit,
      status,
      created_at,
      listings (crop_name, unit),
      buyer_profiles (business_name, profiles (full_name))
    `)
    .eq("farmer_id", userId)
    .order("created_at", { ascending: false });

  const offersList = (rawOffers as unknown as DbOfferRow[]) || [];
  const pendingOffersCount = offersList.filter((o) => o.status === "PENDING").length;

  const recentOffers = offersList.slice(0, 4).map((o) => {
    const listing = o.listings;
    const bp = o.buyer_profiles;
    const buyerName = bp?.business_name || bp?.profiles?.full_name || "Commercial Buyer";

    return {
      id: o.id,
      listing_id: o.listing_id,
      crop_name: listing?.crop_name || "Produce",
      buyer_name: buyerName,
      quantity: Number(o.quantity),
      unit: listing?.unit || "KG",
      price_per_unit: Number(o.price_per_unit),
      status: o.status,
      created_at: o.created_at,
    };
  });

  // 4. Orders & Earnings metrics
  const { data: rawOrders } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      subtotal,
      delivery_method,
      created_at,
      order_items (crop_name, quantity, unit)
    `)
    .eq("farmer_id", userId)
    .order("created_at", { ascending: false });

  const ordersList = (rawOrders as unknown as DbOrderRow[]) || [];
  const activeOrderStatuses = ["ACCEPTED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED"];
  const activeOrders = ordersList.filter((o) => activeOrderStatuses.includes(o.status));
  const completedOrders = ordersList.filter((o) => o.status === "COMPLETED");

  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const pendingOrderValue = activeOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

  const recentOrders = ordersList.slice(0, 4).map((o) => {
    const items = o.order_items || [];
    const firstItem = items[0];

    return {
      id: o.id,
      order_number: o.order_number,
      crop_name: firstItem?.crop_name || "Produce Order",
      quantity: Number(firstItem?.quantity || 0),
      unit: firstItem?.unit || "KG",
      subtotal: Number(o.subtotal),
      status: o.status,
      delivery_method: o.delivery_method,
      created_at: o.created_at,
    };
  });

  return {
    activeListingsCount: activeListings.length,
    totalListingsCount: listingsList.length,
    pendingOffersCount,
    activeOrdersCount: activeOrders.length,
    completedOrdersCount: completedOrders.length,
    totalRevenue,
    pendingOrderValue,
    verificationStatus: (farmerProfile?.verification_status as FarmerDashboardOverview["verificationStatus"]) || "UNVERIFIED",
    farmName: primaryFarmName,
    recentListings,
    recentOffers,
    recentOrders,
  };
}

export type FarmerListingItem = {
  id: string;
  crop_name: string;
  variety: string | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  farm_id: string | null;
  farm_name: string | null;
  quantity_available: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  grade: "A" | "B" | "C" | "UNGRADED";
  harvest_date: string | null;
  available_date: string | null;
  region: string;
  city: string | null;
  description: string | null;
  delivery_available: boolean;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT" | "REMOVED";
  version: number;
  created_at: string;
  images: Array<{
    id: string;
    storage_path: string;
    sort_order: number;
  }>;
};

export async function getFarmerListings(
  userId: string,
  filter?: { status?: string; query?: string }
): Promise<FarmerListingItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(`
      id,
      crop_name,
      variety,
      category_id,
      farm_id,
      quantity_available,
      unit,
      price_per_unit,
      currency,
      grade,
      harvest_date,
      available_date,
      region,
      city,
      description,
      delivery_available,
      status,
      version,
      created_at,
      crop_categories (name, slug),
      farms (name),
      listing_images (id, storage_path, sort_order)
    `)
    .eq("farmer_id", userId)
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "ALL") {
    query = query.eq("status", filter.status as Database["public"]["Enums"]["listing_status"]);
  } else {
    query = query.neq("status", "REMOVED");
  }

  const { data: rawData, error } = await query;

  if (error || !rawData) {
    console.error("[getFarmerListings] error:", error);
    return [];
  }

  const data = rawData as unknown as DbListingRow[];

  const mapped: FarmerListingItem[] = data.map((item) => {
    const cat = item.crop_categories;
    const farm = item.farms;
    const images = (item.listing_images as Array<{ id: string; storage_path: string; sort_order: number }> | null) || [];

    return {
      id: item.id,
      crop_name: item.crop_name,
      variety: item.variety,
      category_id: item.category_id || "",
      category_name: cat?.name || "General Produce",
      category_slug: cat?.slug || "general",
      farm_id: item.farm_id || null,
      farm_name: farm?.name || null,
      quantity_available: Number(item.quantity_available),
      unit: item.unit,
      price_per_unit: Number(item.price_per_unit),
      currency: item.currency || "GHS",
      grade: item.grade,
      harvest_date: item.harvest_date || null,
      available_date: item.available_date || null,
      region: item.region || "Ghana",
      city: item.city || null,
      description: item.description || null,
      delivery_available: Boolean(item.delivery_available),
      status: item.status,
      version: item.version ?? 1,
      created_at: item.created_at,
      images: images.sort((a, b) => a.sort_order - b.sort_order),
    };
  });

  if (filter?.query) {
    const q = filter.query.toLowerCase().trim();
    return mapped.filter(
      (l) =>
        l.crop_name.toLowerCase().includes(q) ||
        (l.variety && l.variety.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q))
    );
  }

  return mapped;
}

export async function getFarmerListingById(
  listingId: string,
  userId: string
): Promise<FarmerListingItem | null> {
  const supabase = await createClient();

  const { data: rawItem, error } = await supabase
    .from("listings")
    .select(`
      id,
      crop_name,
      variety,
      category_id,
      farm_id,
      quantity_available,
      unit,
      price_per_unit,
      currency,
      grade,
      harvest_date,
      available_date,
      region,
      city,
      description,
      delivery_available,
      status,
      version,
      created_at,
      crop_categories (name, slug),
      farms (name),
      listing_images (id, storage_path, sort_order)
    `)
    .eq("id", listingId)
    .eq("farmer_id", userId)
    .maybeSingle();

  if (error || !rawItem) {
    return null;
  }

  const item = rawItem as unknown as DbListingRow;
  const cat = item.crop_categories;
  const farm = item.farms;
  const images = (item.listing_images as Array<{ id: string; storage_path: string; sort_order: number }> | null) || [];

  return {
    id: item.id,
    crop_name: item.crop_name,
    variety: item.variety,
    category_id: item.category_id || "",
    category_name: cat?.name || "General Produce",
    category_slug: cat?.slug || "general",
    farm_id: item.farm_id || null,
    farm_name: farm?.name || null,
    quantity_available: Number(item.quantity_available),
    unit: item.unit,
    price_per_unit: Number(item.price_per_unit),
    currency: item.currency || "GHS",
    grade: item.grade,
    harvest_date: item.harvest_date || null,
    available_date: item.available_date || null,
    region: item.region || "Ghana",
    city: item.city || null,
    description: item.description || null,
    delivery_available: Boolean(item.delivery_available),
    status: item.status,
    version: item.version ?? 1,
    created_at: item.created_at,
    images: images.sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function getFarmerOffers(userId: string) {
  const supabase = await createClient();

  const { data: rawData, error } = await supabase
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
    .eq("farmer_id", userId)
    .order("created_at", { ascending: false });

  if (error || !rawData) {
    if (error) {
      console.error("[getFarmerOffers] error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }
    return [];
  }

  if (rawData.length === 0) {
    return [];
  }

  const buyerIds = Array.from(new Set(rawData.map((o) => o.buyer_id).filter(Boolean)));
  let buyerMap: Record<
    string,
    {
      business_name: string | null;
      business_type: string | null;
      full_name: string | null;
      city: string | null;
      region: string | null;
    }
  > = {};

  if (buyerIds.length > 0) {
    const { data: buyers, error: buyerError } = await supabase
      .from("public_buyer_profiles")
      .select("id, full_name, business_name, business_type, city, region")
      .in("id", buyerIds);

    if (buyerError) {
      console.error("[getFarmerOffers] buyer lookup error:", {
        message: buyerError.message,
        code: buyerError.code,
        details: buyerError.details,
        hint: buyerError.hint,
      });
    } else if (buyers) {
      buyerMap = buyers.reduce(
        (acc, b) => {
          if (b.id) {
            acc[b.id] = b;
          }
          return acc;
        },
        {} as Record<
          string,
          {
            business_name: string | null;
            business_type: string | null;
            full_name: string | null;
            city: string | null;
            region: string | null;
          }
        >
      );
    }
  }

  return rawData.map((o) => {
    const listing = o.listings as {
      id?: string;
      crop_name: string;
      unit: string;
      price_per_unit?: number;
      city?: string | null;
      region?: string;
    } | null;
    const bp = buyerMap[o.buyer_id];

    return {
      id: o.id,
      listing_id: o.listing_id,
      crop_name: listing?.crop_name || "Produce",
      listing_unit_price: Number(listing?.price_per_unit || 0),
      buyer_name: bp?.business_name || bp?.full_name || "Commercial Buyer",
      buyer_business_type: bp?.business_type || "Commercial Buyer",
      buyer_location: bp?.city ? `${bp.city}, ${bp.region}` : bp?.region || "Ghana",
      quantity: Number(o.quantity),
      unit: listing?.unit || "KG",
      price_per_unit: Number(o.price_per_unit),
      total_offer_value: Number(o.quantity) * Number(o.price_per_unit),
      message: o.message,
      status: o.status,
      responded_at: o.responded_at,
      created_at: o.created_at,
    };
  });
}

export async function getFarmerOrders(userId: string) {
  const supabase = await createClient();

  const { data: rawData, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      source,
      status,
      subtotal,
      currency,
      delivery_method,
      delivery_address,
      notes,
      cancel_reason,
      created_at,
      order_items (id, crop_name, unit, quantity, price_per_unit, line_total),
      buyer_profiles (business_name, profiles (full_name, phone, city, region))
    `)
    .eq("farmer_id", userId)
    .order("created_at", { ascending: false });

  if (error || !rawData) {
    console.error("[getFarmerOrders] error:", error);
    return [];
  }

  const data = rawData as unknown as DbOrderRow[];

  return data.map((o) => {
    const bp = o.buyer_profiles;
    const items = o.order_items || [];

    return {
      id: o.id,
      order_number: o.order_number,
      source: o.source,
      status: o.status,
      subtotal: Number(o.subtotal),
      currency: o.currency,
      delivery_method: o.delivery_method,
      delivery_address: o.delivery_address,
      notes: o.notes,
      cancel_reason: o.cancel_reason,
      created_at: o.created_at,
      buyer_name: bp?.business_name || bp?.profiles?.full_name || "Commercial Buyer",
      buyer_phone: bp?.profiles?.phone || null,
      buyer_location: bp?.profiles?.city ? `${bp.profiles.city}, ${bp.profiles.region}` : bp?.profiles?.region || "Ghana",
      items: items.map((i) => ({
        id: i.id,
        crop_name: i.crop_name,
        unit: i.unit,
        quantity: Number(i.quantity),
        price_per_unit: Number(i.price_per_unit),
        line_total: Number(i.line_total),
      })),
    };
  });
}

export async function getFarmerEarnings(userId: string) {
  const orders = await getFarmerOrders(userId);

  const completed = orders.filter((o) => o.status === "COMPLETED");
  const inFulfillment = orders.filter((o) =>
    ["ACCEPTED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED"].includes(o.status)
  );

  const totalCompletedEarnings = completed.reduce((sum, o) => sum + o.subtotal, 0);
  const totalPendingFulfillment = inFulfillment.reduce((sum, o) => sum + o.subtotal, 0);

  return {
    totalCompletedEarnings,
    totalPendingFulfillment,
    completedCount: completed.length,
    inFulfillmentCount: inFulfillment.length,
    completedOrders: completed,
  };
}

export async function getFarmerProfile(userId: string) {
  const supabase = await createClient();

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, region, city, avatar_path")
    .eq("id", userId)
    .single();

  const { data: rawFarmerProfile } = await supabase
    .from("farmer_profiles")
    .select("bio, years_farming, verification_status, verified_at")
    .eq("profile_id", userId)
    .single();

  const { data: rawFarms } = await supabase
    .from("farms")
    .select("id, name, region, district, community, size_hectares, verification_status")
    .eq("farmer_id", userId);

  type ProfileRow = {
    id: string;
    full_name: string;
    phone: string | null;
    region: string | null;
    city: string | null;
    avatar_path: string | null;
  };

  type FarmerProfileRow = {
    bio: string | null;
    years_farming: number | null;
    verification_status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
    verified_at: string | null;
  };

  type FarmItemRow = {
    id: string;
    name: string;
    region: string;
    district: string | null;
    community: string | null;
    size_hectares: number | null;
    verification_status: string;
  };

  return {
    profile: (rawProfile as unknown as ProfileRow) || null,
    farmerProfile: (rawFarmerProfile as unknown as FarmerProfileRow) || null,
    farms: ((rawFarms as unknown as FarmItemRow[]) || []).map((f) => ({
      ...f,
      size_hectares: f.size_hectares !== null ? Number(f.size_hectares) : null,
    })),
  };
}

export async function getCropCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crop_categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function getFarmerFarms(userId: string) {
  const supabase = await createClient();
  const { data: rawData, error } = await supabase
    .from("farms")
    .select("id, name, region, size_hectares")
    .eq("farmer_id", userId)
    .order("name", { ascending: true });

  if (error || !rawData) return [];
  const data = rawData as unknown as Array<{ id: string; name: string; region: string; size_hectares: number | string | null }>;
  return data.map((f) => ({
    id: f.id,
    name: f.name,
    region: f.region,
    size_hectares: f.size_hectares !== null ? Number(f.size_hectares) : null,
  }));
}

export type FarmerVerificationSubmissionItem = {
  id: string;
  farm_id: string | null;
  farm_name: string | null;
  type: "FARMER_IDENTITY" | "FARM" | "BUSINESS";
  document_paths: string[];
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getFarmerVerificationSubmissions(
  userId: string
): Promise<FarmerVerificationSubmissionItem[]> {
  const supabase = await createClient();
  const { data: rawData, error } = await supabase
    .from("verification_submissions")
    .select(`
      id,
      farm_id,
      type,
      document_paths,
      notes,
      status,
      review_notes,
      reviewed_at,
      created_at,
      updated_at,
      farms (
        name
      )
    `)
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });

  if (error || !rawData) {
    if (error) {
      logServerError("getFarmerVerificationSubmissions", { message: error.message });
    }
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rawData as any[]).map((row) => ({
    id: row.id,
    farm_id: row.farm_id,
    farm_name: row.farms?.name || null,
    type: row.type,
    document_paths: Array.isArray(row.document_paths) ? row.document_paths : [],
    notes: row.notes,
    status: row.status,
    review_notes: row.review_notes,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

