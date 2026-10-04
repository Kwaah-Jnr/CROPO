import { createClient } from "@/lib/supabase/server";
import { formatProduceImageUrl } from "@/lib/utils/image";
import type { Database } from "@/types/database.types";

export type BuyerDashboardOverview = {
  activeOrdersCount: number;
  openRequestsCount: number;
  pendingOffersCount: number;
  totalSourcedAmount: number;
  savedSuppliersCount: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    crop_name: string;
    quantity: number;
    unit: string;
    subtotal: number;
    status: string;
    farmer_name: string;
    delivery_method: string;
    created_at: string;
  }>;
  recentRequests: Array<{
    id: string;
    crop_name: string;
    quantity: number;
    unit: string;
    destination_region: string;
    status: string;
    offers_count: number;
    created_at: string;
  }>;
  recentOffers: Array<{
    id: string;
    listing_id: string;
    crop_name: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    status: string;
    farmer_name: string;
    created_at: string;
  }>;
};

export async function getBuyerDashboardOverview(buyerId: string): Promise<BuyerDashboardOverview> {
  const supabase = await createClient();

  // 1. Fetch Orders
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      subtotal,
      delivery_method,
      created_at,
      farmer_id,
      order_items (crop_name, quantity, unit)
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  const allOrders = orders || [];
  const activeOrders = allOrders.filter((o) =>
    ["PENDING", "ACCEPTED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT"].includes(o.status)
  );

  const completedOrders = allOrders.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status));
  const totalSourcedAmount = completedOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);

  // 2. Fetch Buying Requests
  const { data: requests } = await supabase
    .from("buying_requests")
    .select(`
      id,
      crop_name,
      quantity,
      unit,
      destination_region,
      status,
      created_at,
      request_offers (id)
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  const allRequests = requests || [];
  const openRequests = allRequests.filter((r) => r.status === "OPEN");

  // 3. Fetch Sent Offers
  const { data: offers } = await supabase
    .from("offers")
    .select(`
      id,
      listing_id,
      quantity,
      price_per_unit,
      status,
      created_at,
      listings (crop_name, unit, farmer_id)
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  const allOffers = offers || [];
  const pendingOffers = allOffers.filter((o) => o.status === "PENDING");

  // 4. Saved Suppliers Count
  const { count: suppliersCount } = await supabase
    .from("saved_suppliers")
    .select("*", { count: "exact", head: true })
    .eq("buyer_id", buyerId);

  // 5. Farmer Name Lookup Map
  const farmerIds = Array.from(
    new Set([
      ...allOrders.slice(0, 5).map((o) => o.farmer_id),
      ...allOffers.slice(0, 5).map((o) => (o.listings as { farmer_id?: string } | null)?.farmer_id).filter(Boolean),
    ])
  ) as string[];

  let farmerMap: Record<string, string> = {};
  if (farmerIds.length > 0) {
    const { data: farmerProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", farmerIds);

    if (farmerProfiles) {
      farmerMap = farmerProfiles.reduce((acc, p) => {
        acc[p.id] = p.full_name;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  return {
    activeOrdersCount: activeOrders.length,
    openRequestsCount: openRequests.length,
    pendingOffersCount: pendingOffers.length,
    totalSourcedAmount,
    savedSuppliersCount: suppliersCount || 0,
    recentOrders: allOrders.slice(0, 5).map((o: { id: string; order_number: string; subtotal: number | string; status: string; farmer_id: string; delivery_method: string; created_at: string; order_items?: { crop_name?: string; quantity?: number | string; unit?: string }[] }) => {
      const firstItem = o.order_items?.[0] || {};
      return {
        id: o.id,
        order_number: o.order_number,
        crop_name: firstItem.crop_name || "Assorted Produce",
        quantity: firstItem.quantity ? Number(firstItem.quantity) : 0,
        unit: firstItem.unit || "KG",
        subtotal: Number(o.subtotal || 0),
        status: o.status,
        farmer_name: farmerMap[o.farmer_id] || "Verified Farmer",
        delivery_method: o.delivery_method,
        created_at: o.created_at,
      };
    }),
    recentRequests: allRequests.slice(0, 5).map((r: { id: string; crop_name: string; quantity: number | string; unit: string; destination_region: string; status: string; request_offers?: unknown[]; created_at: string }) => ({
      id: r.id,
      crop_name: r.crop_name,
      quantity: Number(r.quantity),
      unit: r.unit,
      destination_region: r.destination_region,
      status: r.status,
      offers_count: r.request_offers?.length || 0,
      created_at: r.created_at,
    })),
    recentOffers: allOffers.slice(0, 5).map((o: { id: string; listing_id: string; quantity: number | string; price_per_unit: number | string; status: string; created_at: string; listings?: { crop_name?: string; unit?: string; farmer_id?: string } | null }) => ({
      id: o.id,
      listing_id: o.listing_id,
      crop_name: o.listings?.crop_name || "Produce Item",
      quantity: Number(o.quantity),
      unit: o.listings?.unit || "KG",
      price_per_unit: Number(o.price_per_unit),
      status: o.status,
      farmer_name: (o.listings?.farmer_id && farmerMap[o.listings.farmer_id]) || "Verified Farmer",
      created_at: o.created_at,
    })),
  };
}

export async function getBuyerOrders(buyerId: string, statusFilter?: string) {
  const supabase = await createClient();

  let query = supabase
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
      created_at,
      farmer_id,
      order_items (
        id,
        listing_id,
        crop_name,
        quantity,
        unit,
        price_per_unit,
        line_total
      )
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "ALL") {
    if (statusFilter === "ACTIVE") {
      query = query.in("status", [
        "PENDING",
        "ACCEPTED",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "IN_TRANSIT",
      ]);
    } else if (statusFilter === "COMPLETED") {
      query = query.in("status", ["DELIVERED", "COMPLETED"]);
    } else if (statusFilter === "CANCELLED") {
      query = query.in("status", ["CANCELLED", "REJECTED", "DISPUTED"]);
    } else {
      query = query.eq("status", statusFilter as Database["public"]["Enums"]["order_status"]);
    }
  }

  const { data: orders, error } = await query;
  if (error || !orders) return [];

  const farmerIds = Array.from(new Set(orders.map((o) => o.farmer_id)));
  let farmerMap: Record<string, { name: string; region: string | null }> = {};

  if (farmerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, region")
      .in("id", farmerIds);

    if (profiles) {
      farmerMap = profiles.reduce((acc, p) => {
        acc[p.id] = { name: p.full_name, region: p.region };
        return acc;
      }, {} as Record<string, { name: string; region: string | null }>);
    }
  }

  return orders.map((o: { id: string; order_number: string; source: string; status: string; subtotal: number | string; currency: string; delivery_method: string; delivery_address: string | null; notes: string | null; created_at: string; farmer_id: string; order_items?: { id: string; listing_id: string | null; crop_name: string; quantity: number | string; unit: string; price_per_unit: number | string; line_total: number | string | null }[] }) => ({
    id: o.id,
    order_number: o.order_number,
    source: o.source,
    status: o.status,
    subtotal: Number(o.subtotal),
    currency: o.currency,
    delivery_method: o.delivery_method,
    delivery_address: o.delivery_address,
    notes: o.notes,
    created_at: o.created_at,
    farmer: {
      id: o.farmer_id,
      name: farmerMap[o.farmer_id]?.name || "Verified Farmer",
      region: farmerMap[o.farmer_id]?.region || null,
    },
    items: (o.order_items || []).map((it: { id: string; listing_id: string | null; crop_name: string; quantity: number | string; unit: string; price_per_unit: number | string; line_total: number | string | null }) => ({
      id: it.id,
      listing_id: it.listing_id || "",
      crop_name: it.crop_name,
      quantity: Number(it.quantity),
      unit: it.unit,
      price_per_unit: Number(it.price_per_unit),
      line_total: Number(it.line_total || 0),
    })),
  }));
}

export async function getBuyerOrderById(orderId: string, buyerId: string) {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      source,
      offer_id,
      request_offer_id,
      status,
      subtotal,
      currency,
      delivery_method,
      delivery_address,
      notes,
      cancel_reason,
      created_at,
      updated_at,
      farmer_id,
      order_items (
        id,
        listing_id,
        crop_name,
        quantity,
        unit,
        price_per_unit,
        line_total
      ),
      order_status_history (
        id,
        from_status,
        to_status,
        note,
        created_at,
        changed_by
      )
    `)
    .eq("id", orderId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (error || !order) return null;

  // Fetch farmer profile
  const { data: farmerProfile } = await supabase
    .from("profiles")
    .select("id, full_name, region, city")
    .eq("id", order.farmer_id)
    .maybeSingle();

  const history = ((order as unknown as { order_status_history?: { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string }[] }).order_status_history || []).sort(
    (a: { created_at: string }, b: { created_at: string }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return {
    id: order.id,
    order_number: order.order_number,
    source: order.source,
    offer_id: order.offer_id,
    request_offer_id: order.request_offer_id,
    status: order.status,
    subtotal: Number(order.subtotal),
    currency: order.currency,
    delivery_method: order.delivery_method,
    delivery_address: order.delivery_address,
    notes: order.notes,
    cancel_reason: order.cancel_reason,
    created_at: order.created_at,
    updated_at: order.updated_at,
    farmer: {
      id: order.farmer_id,
      name: farmerProfile?.full_name || "Verified Farmer",
      region: farmerProfile?.region || null,
      city: farmerProfile?.city || null,
    },
    items: ((order as unknown as { order_items?: { id: string; listing_id: string; crop_name: string; quantity: number | string; unit: string; price_per_unit: number | string; line_total: number | string }[] }).order_items || []).map((it: { id: string; listing_id: string; crop_name: string; quantity: number | string; unit: string; price_per_unit: number | string; line_total: number | string }) => ({
      id: it.id,
      listing_id: it.listing_id,
      crop_name: it.crop_name,
      quantity: Number(it.quantity),
      unit: it.unit,
      price_per_unit: Number(it.price_per_unit),
      line_total: Number(it.line_total),
    })),
    statusHistory: history.map((h: { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string }) => ({
      id: h.id,
      from_status: h.from_status,
      to_status: h.to_status,
      note: h.note,
      created_at: h.created_at,
    })),
  };
}

export async function getBuyerRequests(buyerId: string, statusFilter?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("buying_requests")
    .select(`
      id,
      crop_name,
      quantity,
      unit,
      desired_grade,
      destination_region,
      destination_city,
      required_by,
      target_price_per_unit,
      currency,
      description,
      status,
      created_at,
      crop_categories (name),
      request_offers (
        id,
        quantity,
        price_per_unit,
        status,
        farmer_id
      )
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "ALL") {
    query = query.eq("status", statusFilter as Database["public"]["Enums"]["request_status"]);
  }

  const { data: requests, error } = await query;
  if (error || !requests) return [];

  return requests.map((r: { id: string; crop_name: string; crop_categories?: { name: string } | null; quantity: number | string; unit: string; desired_grade: string | null; destination_region: string; destination_city: string | null; required_by: string | null; target_price_per_unit: number | string | null; currency: string; description: string | null; status: string; created_at: string; request_offers?: { status: string }[] }) => ({
    id: r.id,
    crop_name: r.crop_name,
    category_name: r.crop_categories?.name || "General Agricultural",
    quantity: Number(r.quantity),
    unit: r.unit,
    desired_grade: r.desired_grade,
    destination_region: r.destination_region,
    destination_city: r.destination_city,
    required_by: r.required_by,
    target_price_per_unit: r.target_price_per_unit ? Number(r.target_price_per_unit) : null,
    currency: r.currency,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    offersCount: r.request_offers?.length || 0,
    pendingOffersCount: (r.request_offers || []).filter((ro: { status: string }) => ro.status === "PENDING").length,
  }));
}

export async function getBuyerRequestById(requestId: string, buyerId: string) {
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("buying_requests")
    .select(`
      id,
      crop_name,
      category_id,
      quantity,
      unit,
      desired_grade,
      destination_region,
      destination_city,
      required_by,
      target_price_per_unit,
      currency,
      description,
      status,
      created_at,
      crop_categories (name),
      request_offers (
        id,
        quantity,
        price_per_unit,
        available_date,
        message,
        status,
        responded_at,
        created_at,
        farmer_id,
        listing_id
      )
    `)
    .eq("id", requestId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (error || !request) return null;

  const rawOffers = ((request as unknown as { request_offers?: { id: string; quantity: number | string; price_per_unit: number | string; available_date?: string | null; message?: string | null; status: string; created_at: string; listing_id?: string | null; farmer_id: string }[] }).request_offers || []);
  const farmerIds = Array.from(new Set(rawOffers.map((ro) => ro.farmer_id)));

  let farmerMap: Record<string, { name: string; region: string | null; verification_status: string }> = {};
  if (farmerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, region")
      .in("id", farmerIds);

    const { data: verifs } = await supabase
      .from("farmer_profiles")
      .select("profile_id, verification_status")
      .in("profile_id", farmerIds);

    const verifMap: Record<string, string> = {};
    (verifs || []).forEach((v) => {
      verifMap[v.profile_id] = v.verification_status;
    });

    if (profiles) {
      farmerMap = profiles.reduce((acc, p) => {
        acc[p.id] = {
          name: p.full_name,
          region: p.region,
          verification_status: verifMap[p.id] || "UNVERIFIED",
        };
        return acc;
      }, {} as Record<string, { name: string; region: string | null; verification_status: string }>);
    }
  }

  return {
    id: request.id,
    crop_name: request.crop_name,
    category_name: (request as unknown as { crop_categories?: { name: string } | null }).crop_categories?.name || "General Agricultural",
    quantity: Number(request.quantity),
    unit: request.unit,
    desired_grade: request.desired_grade,
    destination_region: request.destination_region,
    destination_city: request.destination_city,
    required_by: request.required_by,
    target_price_per_unit: request.target_price_per_unit ? Number(request.target_price_per_unit) : null,
    currency: request.currency,
    description: request.description,
    status: request.status,
    created_at: request.created_at,
    offers: rawOffers.map((ro: { id: string; quantity: number | string; price_per_unit: number | string; available_date?: string | null; message?: string | null; status: string; created_at: string; listing_id?: string | null; farmer_id: string }) => ({
      id: ro.id,
      quantity: Number(ro.quantity),
      price_per_unit: Number(ro.price_per_unit),
      available_date: ro.available_date,
      message: ro.message,
      status: ro.status,
      created_at: ro.created_at,
      listing_id: ro.listing_id,
      farmer: {
        id: ro.farmer_id,
        name: farmerMap[ro.farmer_id]?.name || "Verified Farmer",
        region: farmerMap[ro.farmer_id]?.region || null,
        verification_status: farmerMap[ro.farmer_id]?.verification_status || "UNVERIFIED",
      },
    })),
  };
}

export async function getBuyerOffers(buyerId: string, statusFilter?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("offers")
    .select(`
      id,
      listing_id,
      quantity,
      price_per_unit,
      message,
      status,
      responded_at,
      created_at,
      farmer_id,
      listings (
        id,
        crop_name,
        unit,
        price_per_unit,
        grade,
        region,
        city,
        status,
        listing_images (storage_path)
      )
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "ALL") {
    query = query.eq("status", statusFilter as Database["public"]["Enums"]["offer_status"]);
  }

  const { data: offers, error } = await query;
  if (error || !offers) return [];

  const farmerIds = Array.from(new Set(offers.map((o) => o.farmer_id)));
  let farmerMap: Record<string, string> = {};

  if (farmerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", farmerIds);

    if (profiles) {
      farmerMap = profiles.reduce((acc, p) => {
        acc[p.id] = p.full_name;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  return offers.map((o: { id: string; listing_id: string; quantity: number | string; price_per_unit: number | string; message: string | null; status: string; responded_at: string | null; created_at: string; farmer_id: string; listings?: { crop_name?: string; unit?: string; price_per_unit?: number | string; grade?: string; region?: string; city?: string | null; status?: string; listing_images?: { storage_path: string }[] } | null }) => {
    const listing = o.listings || {};
    const firstImg = listing.listing_images?.[0]?.storage_path;
    return {
      id: o.id,
      listing_id: o.listing_id,
      quantity: Number(o.quantity),
      price_per_unit: Number(o.price_per_unit),
      message: o.message,
      status: o.status,
      responded_at: o.responded_at,
      created_at: o.created_at,
      farmer: {
        id: o.farmer_id,
        name: farmerMap[o.farmer_id] || "Verified Farmer",
      },
      listing: {
        crop_name: listing.crop_name || "Produce Item",
        unit: listing.unit || "KG",
        listing_price: Number(listing.price_per_unit || 0),
        grade: listing.grade || "A",
        region: listing.region || "",
        city: listing.city || null,
        status: listing.status || "ACTIVE",
        image_url: firstImg ? formatProduceImageUrl(firstImg) : null,
      },
    };
  });
}

export async function getBuyerSavedSuppliers(buyerId: string) {
  const supabase = await createClient();

  const { data: saved, error } = await supabase
    .from("saved_suppliers")
    .select(`
      id,
      farmer_id,
      created_at
    `)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error || !saved || saved.length === 0) return [];

  const farmerIds = saved.map((s) => s.farmer_id);
  const { data: farmers } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      region,
      city,
      farms (id, name, region)
    `)
    .in("id", farmerIds);

  if (!farmers) return [];

  const { data: farmerProfiles } = await supabase
    .from("farmer_profiles")
    .select("profile_id, verification_status, bio, years_farming")
    .in("profile_id", farmerIds);

  const profileMap: Record<string, { verification_status: string; bio: string | null; years_farming: number | null }> = {};
  (farmerProfiles || []).forEach((fp) => {
    profileMap[fp.profile_id] = {
      verification_status: fp.verification_status,
      bio: fp.bio,
      years_farming: fp.years_farming,
    };
  });

  // Count active listings per farmer
  const { data: listings } = await supabase
    .from("listings")
    .select("id, farmer_id")
    .in("farmer_id", farmerIds)
    .eq("status", "ACTIVE");

  const counts: Record<string, number> = {};
  (listings || []).forEach((l) => {
    counts[l.farmer_id] = (counts[l.farmer_id] || 0) + 1;
  });

  return farmers.map((f: { id: string; full_name: string; region: string | null; city: string | null; farms?: { name: string; region: string }[] }) => ({
    farmer_id: f.id,
    full_name: f.full_name,
    region: f.region,
    city: f.city,
    verification_status: profileMap[f.id]?.verification_status || "UNVERIFIED",
    bio: profileMap[f.id]?.bio || null,
    years_farming: profileMap[f.id]?.years_farming || null,
    farms: (f.farms || []).map((farm: { name: string; region: string }) => ({ name: farm.name, region: farm.region })),
    active_listings_count: counts[f.id] || 0,
  }));
}

export async function getBuyerProfileData(buyerId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, region, city, avatar_path")
    .eq("id", buyerId)
    .maybeSingle();

  const { data: buyerProfile } = await supabase
    .from("buyer_profiles")
    .select("profile_id, business_name, business_type, verification_status")
    .eq("profile_id", buyerId)
    .maybeSingle();

  return {
    profile: profile || null,
    buyerProfile: buyerProfile || null,
  };
}

export async function getOpenBuyingRequestsForFarmers() {
  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("buying_requests")
    .select(`
      id,
      crop_name,
      quantity,
      unit,
      desired_grade,
      destination_region,
      destination_city,
      required_by,
      target_price_per_unit,
      currency,
      description,
      status,
      created_at,
      buyer_id,
      crop_categories (name)
    `)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });

  if (error || !requests) return [];

  return requests.map((r: { id: string; crop_name: string; quantity: number | string; unit: string; desired_grade: string | null; destination_region: string; destination_city: string | null; required_by: string | null; target_price_per_unit: number | string | null; currency: string; description: string | null; status: string; created_at: string; buyer_id: string; crop_categories?: { name: string } | null }) => ({
    id: r.id,
    crop_name: r.crop_name,
    category_name: r.crop_categories?.name || "General Agricultural",
    quantity: Number(r.quantity),
    unit: r.unit,
    desired_grade: r.desired_grade,
    destination_region: r.destination_region,
    destination_city: r.destination_city,
    required_by: r.required_by,
    target_price_per_unit: r.target_price_per_unit ? Number(r.target_price_per_unit) : null,
    currency: r.currency,
    description: r.description,
    status: r.status,
    created_at: r.created_at,
    buyer_id: r.buyer_id,
  }));
}
