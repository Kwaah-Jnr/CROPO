import { createPublicClient } from "@/lib/supabase/public";
import { DatabaseQueryError, logServerError } from "@/lib/utils/errors";
import { formatProduceImageUrl } from "@/lib/utils/image";
import type { Database } from "@/types/database.types";

export type MarketplaceListing = {
  id: string;
  crop_name: string;
  variety: string | null;
  category_name: string;
  category_slug: string;
  quantity_available: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  grade: "A" | "B" | "C" | "UNGRADED";
  harvest_date: string;
  available_date: string;
  region: string;
  city: string;
  description: string;
  delivery_available: boolean;
  status: "ACTIVE";
  images: string[];
  farmer: {
    id: string;
    full_name: string;
    region: string;
    city: string;
    avatar_url: string | null;
    bio: string;
    years_farming: number;
    verification_status: "VERIFIED" | "PENDING" | "UNVERIFIED";
    farm_name: string;
    farm_size: string;
  };
};

export type MarketplaceFilterParams = {
  q?: string;
  category?: string;
  region?: string;
  grade?: string;
  minPrice?: string;
  maxPrice?: string;
  delivery?: string;
};

type DbListing = {
  id: string;
  farmer_id: string;
  farm_id: string | null;
  crop_name: string;
  variety: string | null;
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
  status: string;
  crop_categories: { name: string; slug: string } | null;
  farms: { name: string; size_hectares: number | null } | null;
  listing_images: Array<{ storage_path: string; sort_order: number }> | null;
};

type PublicFarmerProfile = {
  id: string;
  full_name: string;
  region: string | null;
  city: string | null;
  avatar_path: string | null;
  bio: string | null;
  years_farming: number | null;
  verification_status: "VERIFIED" | "PENDING" | "UNVERIFIED";
};

type FarmRow = {
  name: string;
  size_hectares: number | null;
};

/**
 * Retrieves active public listings from Supabase with search & filter params.
 * Returns empty array [] if no live listings exist. Never fabricates inventory.
 */
export async function getMarketplaceListings(
  filters: MarketplaceFilterParams = {}
): Promise<MarketplaceListing[]> {
  try {
    const supabase = createPublicClient();

    let query = supabase
      .from("listings")
      .select(`
        id,
        farmer_id,
        farm_id,
        crop_name,
        variety,
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
        crop_categories (name, slug),
        farms (name, size_hectares),
        listing_images (storage_path, sort_order)
      `)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    // Database-level filters
    if (filters.region && filters.region !== "all") {
      query = query.ilike("region", filters.region);
    }
    if (filters.grade && filters.grade !== "all") {
      query = query.eq("grade", filters.grade as Database["public"]["Enums"]["produce_grade"]);
    }
    if (filters.delivery === "true") {
      query = query.eq("delivery_available", true);
    }
    if (filters.minPrice) {
      const min = Number(filters.minPrice);
      if (!isNaN(min)) query = query.gte("price_per_unit", min);
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice);
      if (!isNaN(max)) query = query.lte("price_per_unit", max);
    }

    const { data: rawListings, error: listingsError } = await query;

    if (listingsError) {
      logServerError("getMarketplaceListings", { code: listingsError.code, message: listingsError.message });
      throw new DatabaseQueryError("Failed to fetch marketplace listings", listingsError);
    }

    if (!rawListings || rawListings.length === 0) {
      return [];
    }

    const dbListings = rawListings as unknown as DbListing[];

    // Fetch corresponding farmer details strictly via public_farmer_profiles view
    const farmerIds = Array.from(new Set(dbListings.map((l) => l.farmer_id).filter(Boolean)));
    const farmerMap = new Map<string, PublicFarmerProfile>();

    if (farmerIds.length > 0) {
      const { data: rawFarmers, error: farmersError } = await supabase
        .from("public_farmer_profiles")
        .select("id, full_name, region, city, avatar_path, bio, years_farming, verification_status")
        .in("id", farmerIds);

      if (farmersError) {
        logServerError("getMarketplaceListings:farmers", { code: farmersError.code, message: farmersError.message });
        throw new DatabaseQueryError("Failed to fetch farmer profiles for listings", farmersError);
      }

      if (rawFarmers) {
        const farmers = rawFarmers as unknown as PublicFarmerProfile[];
        for (const f of farmers) {
          farmerMap.set(f.id, f);
        }
      }
    }

    const mapped: MarketplaceListing[] = dbListings.map((item: DbListing) => {
      const farmerInfo = farmerMap.get(item.farmer_id);
      const farm = item.farms;
      const category = item.crop_categories;
      const images = item.listing_images || [];

      return {
        id: item.id,
        crop_name: item.crop_name,
        variety: item.variety,
        category_name: category?.name || "General Produce",
        category_slug: category?.slug || "general",
        quantity_available: Number(item.quantity_available),
        unit: item.unit,
        price_per_unit: Number(item.price_per_unit),
        currency: item.currency || "GHS",
        grade: item.grade,
        harvest_date: item.harvest_date || "",
        available_date: item.available_date || "",
        region: item.region,
        city: item.city || "",
        description: item.description || "",
        delivery_available: item.delivery_available,
        status: "ACTIVE",
        images: images
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((img) => formatProduceImageUrl(img.storage_path))
          .filter((url): url is string => Boolean(url)),
        farmer: {
          id: item.farmer_id,
          full_name: farmerInfo?.full_name || "Registered Farmer",
          region: farmerInfo?.region || item.region,
          city: farmerInfo?.city || item.city || "",
          avatar_url: farmerInfo?.avatar_path || null,
          bio: farmerInfo?.bio || "",
          years_farming: farmerInfo?.years_farming || 0,
          verification_status: farmerInfo?.verification_status || "UNVERIFIED",
          farm_name: farm?.name || "Registered Farm",
          farm_size: farm?.size_hectares ? `${farm.size_hectares} Hectares` : "Registered Holding",
        },
      };
    });

    // In-memory text search and category slug filter
    return mapped.filter((listing) => {
      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const matchesName = listing.crop_name.toLowerCase().includes(query);
        const matchesVariety = listing.variety?.toLowerCase().includes(query);
        const matchesCity = listing.city.toLowerCase().includes(query);
        const matchesRegion = listing.region.toLowerCase().includes(query);
        if (!matchesName && !matchesVariety && !matchesCity && !matchesRegion) {
          return false;
        }
      }

      if (filters.category && filters.category !== "all") {
        if (listing.category_slug.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  } catch (error) {
    if (error instanceof DatabaseQueryError) throw error;
    logServerError("getMarketplaceListings:unexpected", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new DatabaseQueryError(
      "Failed to load marketplace listings",
      error instanceof Error ? error : undefined
    );
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Get a single live listing by ID */
export async function getMarketplaceListingById(id: string): Promise<MarketplaceListing | null> {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  try {
    const supabase = createPublicClient();
    const { data: rawItem, error } = await supabase
      .from("listings")
      .select(`
        id,
        farmer_id,
        farm_id,
        crop_name,
        variety,
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
        crop_categories (name, slug),
        farms (name, size_hectares),
        listing_images (storage_path, sort_order)
      `)
      .eq("id", id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) {
      logServerError("getMarketplaceListingById", { code: error.code, message: error.message });
      throw new DatabaseQueryError("Failed to fetch marketplace listing", error);
    }

    if (!rawItem) {
      return null;
    }

    const item = rawItem as unknown as DbListing;

    const { data: rawFarmer, error: farmerError } = await supabase
      .from("public_farmer_profiles")
      .select("id, full_name, region, city, avatar_path, bio, years_farming, verification_status")
      .eq("id", item.farmer_id)
      .maybeSingle();

    if (farmerError) {
      logServerError("getMarketplaceListingById:farmer", { code: farmerError.code, message: farmerError.message });
      throw new DatabaseQueryError("Failed to fetch farmer profile for listing", farmerError);
    }

    const farmerInfo = rawFarmer as unknown as PublicFarmerProfile | null;
    const farm = item.farms;
    const category = item.crop_categories;
    const images = item.listing_images || [];

    return {
      id: item.id,
      crop_name: item.crop_name,
      variety: item.variety,
      category_name: category?.name || "General Produce",
      category_slug: category?.slug || "general",
      quantity_available: Number(item.quantity_available),
      unit: item.unit,
      price_per_unit: Number(item.price_per_unit),
      currency: item.currency || "GHS",
      grade: item.grade,
      harvest_date: item.harvest_date || "",
      available_date: item.available_date || "",
      region: item.region,
      city: item.city || "",
      description: item.description || "",
      delivery_available: item.delivery_available,
      status: "ACTIVE",
      images: images
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => formatProduceImageUrl(img.storage_path))
        .filter((url): url is string => Boolean(url)),
      farmer: {
        id: item.farmer_id,
        full_name: farmerInfo?.full_name || "Registered Farmer",
        region: farmerInfo?.region || item.region,
        city: farmerInfo?.city || item.city || "",
        avatar_url: farmerInfo?.avatar_path || null,
        bio: farmerInfo?.bio || "",
        years_farming: farmerInfo?.years_farming || 0,
        verification_status: farmerInfo?.verification_status || "UNVERIFIED",
        farm_name: farm?.name || "Registered Farm",
        farm_size: farm?.size_hectares ? `${farm.size_hectares} Hectares` : "Registered Holding",
      },
    };
  } catch (err) {
    if (err instanceof DatabaseQueryError) throw err;
    logServerError("getMarketplaceListingById:unexpected", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw new DatabaseQueryError(
      "Failed to load marketplace listing",
      err instanceof Error ? err : undefined
    );
  }
}

/** Get a public farmer profile and their active listings */
export async function getFarmerProfileById(farmerId: string) {
  if (!UUID_REGEX.test(farmerId)) {
    return null;
  }

  try {
    const supabase = createPublicClient();
    const { data: rawFarmer, error: farmerError } = await supabase
      .from("public_farmer_profiles")
      .select("id, full_name, region, city, avatar_path, bio, years_farming, verification_status")
      .eq("id", farmerId)
      .maybeSingle();

    if (farmerError) {
      logServerError("getFarmerProfileById", { code: farmerError.code, message: farmerError.message });
      throw new DatabaseQueryError("Failed to fetch farmer profile", farmerError);
    }

    if (!rawFarmer) {
      return null;
    }

    const farmerInfo = rawFarmer as unknown as PublicFarmerProfile;

    const { data: rawFarms, error: farmsError } = await supabase
      .from("farms")
      .select("name, size_hectares")
      .eq("farmer_id", farmerId)
      .limit(1);

    if (farmsError) {
      logServerError("getFarmerProfileById:farms", { code: farmsError.code, message: farmsError.message });
      throw new DatabaseQueryError("Failed to fetch farms for profile", farmsError);
    }

    const farms = rawFarms as unknown as FarmRow[] | null;
    const primaryFarm = farms?.[0];

    const farmer = {
      id: farmerInfo.id,
      full_name: farmerInfo.full_name,
      region: farmerInfo.region || "Ghana",
      city: farmerInfo.city || "",
      avatar_url: farmerInfo.avatar_path || null,
      bio: farmerInfo.bio || "",
      years_farming: farmerInfo.years_farming || 0,
      verification_status: farmerInfo.verification_status,
      farm_name: primaryFarm?.name || "Registered Farm Holding",
      farm_size: primaryFarm?.size_hectares ? `${primaryFarm.size_hectares} Hectares` : "Commercial Farm",
    };

    // Active listings by this farmer
    const listings = await getMarketplaceListings();
    const farmerListings = listings.filter((l) => l.farmer.id === farmerId);

    return {
      farmer,
      listings: farmerListings,
    };
  } catch (err) {
    if (err instanceof DatabaseQueryError) throw err;
    logServerError("getFarmerProfileById:unexpected", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw new DatabaseQueryError(
      "Failed to load farmer profile",
      err instanceof Error ? err : undefined
    );
  }
}
