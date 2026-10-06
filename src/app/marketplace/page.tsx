import { Suspense } from "react";
import Link from "next/link";
import { PlusCircle, Sprout } from "lucide-react";

import { ListingCard } from "@/components/marketplace/listing-card";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { Button } from "@/components/ui/button";
import { getMarketplaceListings, type MarketplaceFilterParams } from "@/lib/data/marketplace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Produce Marketplace — Browse Ghanaian Harvests",
  description:
    "Explore fresh agricultural produce available for sale directly from verified farmers across Ghana. Filter by crop, region, volume, and quality grade.",
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<MarketplaceFilterParams>;
}) {
  const params = await searchParams;
  const listings = await getMarketplaceListings(params);
  const hasActiveFilters = Boolean(
    params.q ||
      params.category ||
      params.region ||
      params.grade ||
      params.minPrice ||
      params.maxPrice ||
      params.delivery ||
      params.minQuantity ||
      params.verified
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header & Post Request Action */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sprout className="size-3.5" aria-hidden="true" />
                <span>Agricultural Marketplace</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Available Harvests & Produce
              </h1>
              <p className="text-sm text-muted-foreground">
                Source directly from farms across Ghana. Standardized units, transparent prices, verified quality.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href="/signup">
                  <PlusCircle className="mr-1.5 size-3.5" />
                  Post Buying Request
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sell Produce</Link>
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <Suspense fallback={<div className="h-24 w-full rounded-lg border bg-card animate-pulse" />}>
            <MarketplaceFilters />
          </Suspense>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Showing <span className="font-semibold text-foreground">{listings.length}</span>{" "}
              {listings.length === 1 ? "available listing" : "available listings"}
            </p>
            <p className="text-xs">Prices in Ghana Cedi (GH₵)</p>
          </div>

          {/* Listings Grid */}
          {listings.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Sprout className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {hasActiveFilters ? "No matching produce found" : "No active produce listings at the moment"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "Try adjusting your search criteria, clearing filters, or exploring other agricultural regions."
                    : "Registered farmers can list their harvest to reach commercial buyers across Ghana."}
                </p>
              </div>
              <div>
                {hasActiveFilters ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/marketplace">Clear all filters</Link>
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button asChild size="sm">
                      <Link href="/signup">Sell Produce</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/signup">Post Buying Request</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
