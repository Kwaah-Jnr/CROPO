import { cache } from "react";
import { unstable_cache } from "next/cache";
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
  minQuantity?: string;
  verified?: string;
  page?: string | number;
  pageSize?: string | number;
};

export type MarketplacePaginationMeta = {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type MarketplaceListingsResult = MarketplaceListing[] &
  MarketplacePaginationMeta & {
    listings: MarketplaceListing[];
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createPaginatedResult(
  items: MarketplaceListing[],
  totalCount: number,
  page: number,
  pageSize: number
): MarketplaceListingsResult {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const result = Object.assign([...items], {
    listings: items,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  });
  return result as MarketplaceListingsResult;
}

/**
 * Retrieves active public listings from Supabase with search & filter params and database-side pagination.
 * Returns empty array [] with pagination metadata if no live listings exist. Never fabricates inventory.
 */
export async function getMarketplaceListings(
  filters: MarketplaceFilterParams = {}
): Promise<MarketplaceListingsResult> {
  try {
    const supabase = createPublicClient();

    const page = Math.max(1, parseInt(String(filters.page || "1"), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(filters.pageSize || "12"), 10) || 12);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("listings")
      .select(
        `
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
        crop_categories!inner (id, name, slug),
        farms (name, size_hectares),
        listing_images (storage_path, sort_order)
      `,
        { count: "exact" }
      )
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    // Database-level text search via PostgreSQL tsvector index
    if (filters.q) {
      const cleanQ = filters.q.trim();
      if (cleanQ) {
        query = query.textSearch("search", cleanQ, { config: "simple", type: "websearch" });
      }
    }

    // Database-level category filtering
    if (filters.category && filters.category !== "all") {
      query = query.eq("crop_categories.slug", filters.category.toLowerCase().trim());
    }

    // Database-level region filter
    if (filters.region && filters.region !== "all") {
      query = query.ilike("region", filters.region);
    }

    // Database-level grade filter
    if (filters.grade && filters.grade !== "all") {
      query = query.eq("grade", filters.grade as Database["public"]["Enums"]["produce_grade"]);
    }

    // Database-level delivery filter
    if (filters.delivery === "true") {
      query = query.eq("delivery_available", true);
    }

    // Database-level price filters
    if (filters.minPrice) {
      const min = Number(filters.minPrice);
      if (!isNaN(min)) query = query.gte("price_per_unit", min);
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice);
      if (!isNaN(max)) query = query.lte("price_per_unit", max);
    }

    // Database-level quantity filter
    if (filters.minQuantity) {
      const minQty = Number(filters.minQuantity);
      if (!isNaN(minQty) && minQty > 0) query = query.gte("quantity_available", minQty);
    }

    // Database-level verified farmer filter
    if (filters.verified === "true") {
      const { data: verifiedFarmers, error: vErr } = await supabase
        .from("public_farmer_profiles")
        .select("id")
        .eq("verification_status", "VERIFIED");

      if (vErr) {
        logServerError("getMarketplaceListings:verifiedFarmers", {
          code: vErr.code,
          message: vErr.message,
        });
        throw new DatabaseQueryError("Failed to fetch verified farmers filter", vErr);
      }

      const verifiedIds = (verifiedFarmers || [])
        .map((f) => f.id)
        .filter((id): id is string => Boolean(id));
      if (verifiedIds.length === 0) {
        return createPaginatedResult([], 0, page, pageSize);
      }
      query = query.in("farmer_id", verifiedIds);
    }

    // Apply database pagination (at most pageSize listings retrieved)
    query = query.range(from, to);

    const { data: rawListings, count: totalCount, error: listingsError } = await query;

    if (listingsError) {
      if (listingsError.code === "PGRST103") {
        // Page requested is beyond the available range (e.g. user requested page 99)
        const match = listingsError.details?.match(/there are only (\d+) rows/);
        const resolvedTotal = totalCount ?? (match ? parseInt(match[1], 10) : 0);
        return createPaginatedResult([], resolvedTotal, page, pageSize);
      }
      logServerError("getMarketplaceListings", { code: listingsError.code, message: listingsError.message });
      throw new DatabaseQueryError("Failed to fetch marketplace listings", listingsError);
    }

    const total = totalCount ?? 0;
    if (!rawListings || rawListings.length === 0) {
      return createPaginatedResult([], total, page, pageSize);
    }

    const dbListings = rawListings as unknown as DbListing[];

    // Fetch corresponding farmer details strictly via public_farmer_profiles view for the current page
    const farmerIds = Array.from(new Set(dbListings.map((l) => l.farmer_id).filter(Boolean)));
    const farmerMap = new Map<string, PublicFarmerProfile>();

    if (farmerIds.length > 0) {
      const { data: rawFarmers, error: farmersError } = await supabase
        .from("public_farmer_profiles")
        .select("id, full_name, region, city, avatar_path, bio, years_farming, verification_status")
        .in("id", farmerIds);

      if (farmersError) {
        logServerError("getMarketplaceListings:farmers", {
          code: farmersError.code,
          message: farmersError.message,
        });
        throw new DatabaseQueryError("Failed to fetch farmer profiles for listings", farmersError);
      }

      if (rawFarmers) {
        const farmers = rawFarmers as unknown as PublicFarmerProfile[];
        for (const f of farmers) {
          farmerMap.set(f.id, f);
        }
      }
    }

    const items: MarketplaceListing[] = dbListings.map((item: DbListing) => {
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

    return createPaginatedResult(items, total, page, pageSize);
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

/**
 * Retrieves a targeted slice of recent active listings for the homepage.
 * Strictly queries only the required number of records (default 4) without full catalog scans.
 */
async function fetchFeaturedListingsDirect(limit = 4): Promise<MarketplaceListing[]> {
  try {
    const supabase = createPublicClient();

    const { data: rawListings, error: listingsError } = await supabase
      .from("listings")
      .select(
        `
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
      `
      )
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (listingsError) {
      logServerError("getFeaturedListings", { code: listingsError.code, message: listingsError.message });
      throw new DatabaseQueryError("Failed to fetch featured listings", listingsError);
    }

    if (!rawListings || rawListings.length === 0) {
      return [];
    }

    const dbListings = rawListings as unknown as DbListing[];
    const farmerIds = Array.from(new Set(dbListings.map((l) => l.farmer_id).filter(Boolean)));
    const farmerMap = new Map<string, PublicFarmerProfile>();

    if (farmerIds.length > 0) {
      const { data: rawFarmers, error: farmersError } = await supabase
        .from("public_farmer_profiles")
        .select("id, full_name, region, city, avatar_path, bio, years_farming, verification_status")
        .in("id", farmerIds);

      if (farmersError) {
        logServerError("getFeaturedListings:farmers", {
          code: farmersError.code,
          message: farmersError.message,
        });
        throw new DatabaseQueryError("Failed to fetch farmer profiles for featured listings", farmersError);
      }

      if (rawFarmers) {
        for (const f of rawFarmers as unknown as PublicFarmerProfile[]) {
          farmerMap.set(f.id, f);
        }
      }
    }

    return dbListings.map((item: DbListing) => {
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
  } catch (error) {
    if (error instanceof DatabaseQueryError) throw error;
    logServerError("getFeaturedListings:unexpected", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new DatabaseQueryError(
      "Failed to load featured listings",
      error instanceof Error ? error : undefined
    );
  }
}

function getCachedFeaturedListings(limit: number) {
  try {
    const cachedFn = unstable_cache(
      async () => fetchFeaturedListingsDirect(limit),
      ["featured-listings", String(limit)],
      {
        revalidate: 60,
        tags: ["featured-listings", "marketplace-listings"],
      }
    );
    return cachedFn();
  } catch (err: unknown) {
    const isCacheMissing = err instanceof Error && err.message.includes("incrementalCache missing");
    if (isCacheMissing || !process.env.NEXT_RUNTIME) {
      return fetchFeaturedListingsDirect(limit);
    }
    throw err;
  }
}

/**
 * Retrieves a targeted slice of recent active listings for the homepage.
 * Cached with a 60-second revalidation interval and tagged for on-demand invalidation.
 */
export async function getFeaturedListings(limit = 4): Promise<MarketplaceListing[]> {
  try {
    return await getCachedFeaturedListings(limit);
  } catch (err: unknown) {
    const isCacheMissing = err instanceof Error && err.message.includes("incrementalCache missing");
    if (isCacheMissing || !process.env.NEXT_RUNTIME) {
      return await fetchFeaturedListingsDirect(limit);
    }
    throw err;
  }
}

async function fetchMarketplaceListingByIdDirect(
  id: string
): Promise<MarketplaceListing | null> {
  const supabase = createPublicClient();
  const { data: rawItem, error } = await supabase
    .from("listings")
    .select(
      `
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
    `
    )
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
    logServerError("getMarketplaceListingById:farmer", {
      code: farmerError.code,
      message: farmerError.message,
    });
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
}

function getCachedListing(id: string) {
  try {
    const cachedFn = unstable_cache(
      async () => fetchMarketplaceListingByIdDirect(id),
      ["marketplace-listing", id],
      {
        revalidate: 30,
        tags: ["marketplace-listings", `listing-${id}`],
      }
    );
    return cachedFn();
  } catch (err: unknown) {
    const isCacheMissing = err instanceof Error && err.message.includes("incrementalCache missing");
    if (isCacheMissing || !process.env.NEXT_RUNTIME) {
      return fetchMarketplaceListingByIdDirect(id);
    }
    throw err;
  }
}

/** Get a single live listing by ID (memoized with React cache for deduplication and unstable_cache across requests) */
export const getMarketplaceListingById = cache(async function getMarketplaceListingById(
  id: string
): Promise<MarketplaceListing | null> {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  try {
    return await getCachedListing(id);
  } catch (err: unknown) {
    const isCacheMissing = err instanceof Error && err.message.includes("incrementalCache missing");
    if (isCacheMissing || !process.env.NEXT_RUNTIME) {
      return await fetchMarketplaceListingByIdDirect(id);
    }
    if (err instanceof DatabaseQueryError) throw err;
    logServerError("getMarketplaceListingById:unexpected", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw new DatabaseQueryError(
      "Failed to load marketplace listing",
      err instanceof Error ? err : undefined
    );
  }
});

/** Get a public farmer profile and their active listings directly without full catalog scans */
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

    // Active listings by this farmer - direct targeted query
    const { data: rawListings, error: listingsError } = await supabase
      .from("listings")
      .select(
        `
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
      `
      )
      .eq("farmer_id", farmerId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    if (listingsError) {
      logServerError("getFarmerProfileById:listings", {
        code: listingsError.code,
        message: listingsError.message,
      });
      throw new DatabaseQueryError("Failed to fetch listings for farmer profile", listingsError);
    }

    const dbListings = (rawListings || []) as unknown as DbListing[];
    const farmerListings: MarketplaceListing[] = dbListings.map((item) => {
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
          id: farmer.id,
          full_name: farmer.full_name,
          region: farmer.region,
          city: farmer.city,
          avatar_url: farmer.avatar_url,
          bio: farmer.bio,
          years_farming: farmer.years_farming,
          verification_status: farmer.verification_status,
          farm_name: farm?.name || farmer.farm_name,
          farm_size: farm?.size_hectares ? `${farm.size_hectares} Hectares` : farmer.farm_size,
        },
      };
    });

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
