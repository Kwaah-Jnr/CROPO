import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Filter, MapPin, Search, Truck } from "lucide-react";

import { BuyNowDialog } from "@/components/buyer/buy-now-dialog";
import { MakeOfferDialog } from "@/components/buyer/make-offer-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GHANA_REGIONS } from "@/config/regions";
import { requireRole } from "@/lib/auth/session";
import { getMarketplaceListings, type MarketplaceListing } from "@/lib/data/marketplace";
import { getCropCategories } from "@/lib/data/farmer";
import { formatProduceImageUrl } from "@/lib/utils/image";

export const metadata = {
  title: "Procurement Marketplace — Commercial Buyer Dashboard | Cropo",
  description: "Browse verified produce harvests directly from farmers in Ghana.",
};

export default async function BuyerMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    region?: string;
    grade?: string;
    delivery?: string;
  }>;
}) {
  const profile = await requireRole("BUYER");
  const params = await searchParams;

  const [categories, listings] = await Promise.all([
    getCropCategories(),
    getMarketplaceListings(params),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <PageHeader
          title="Direct Sourcing Marketplace"
          description="Purchase farm-fresh inventory directly or propose custom wholesale contract offers."
        />
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/buyer/requests/new">
            Can&apos;t find what you need? Post a Request
          </Link>
        </Button>
      </div>

      {/* Filter Bar */}
      <form method="GET" className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Keyword Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Search crops (e.g. Tomatoes, Yam, Plantain)..."
              defaultValue={params.q || ""}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              name="category"
              defaultValue={params.category || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Categories</option>
              {categories.map((c: { id: string; name: string; slug: string }) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <select
              name="region"
              defaultValue={params.region || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Regions</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r} Region
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <select
              name="grade"
              defaultValue={params.grade || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Any Quality Grade</option>
              <option value="A">Grade A (Premium)</option>
              <option value="B">Grade B (Standard)</option>
              <option value="C">Grade C (Processing)</option>
              <option value="UNGRADED">Ungraded</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              name="delivery"
              value="true"
              defaultChecked={params.delivery === "true"}
              className="size-4 rounded border-input text-primary focus:ring-primary"
            />
            <span>Farm Delivery Available</span>
          </label>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/dashboard/buyer/marketplace">Reset</Link>
            </Button>
            <Button type="submit" size="sm" className="h-8 text-xs">
              <Filter className="mr-1.5 size-3" /> Apply Filters
            </Button>
          </div>
        </div>
      </form>

      {/* Produce Listings Results */}
      <div>
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong>{listings.length}</strong> active batch {listings.length === 1 ? "listing" : "listings"}
          </span>
        </div>

        {listings.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l: MarketplaceListing) => {
              const mainImg = l.images?.[0] ? formatProduceImageUrl(l.images[0]) : "/images/placeholder-crop.svg";
              return (
                <div
                  key={l.id}
                  className="rounded-xl border bg-card overflow-hidden shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all group"
                >
                  <div>
                    {/* Image & Badges */}
                    <div className="relative aspect-16/10 w-full bg-muted overflow-hidden">
                      <Image
                        src={mainImg || "/images/placeholder-crop.svg"}
                        alt={l.crop_name}
                        fill
                        className="object-cover group-hover:scale-103 transition-transform duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                        <span className="rounded bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                          Grade {l.grade}
                        </span>
                        {l.delivery_available ? (
                          <span className="rounded bg-primary/90 text-primary-foreground px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                            <Truck className="size-2.5" /> Delivery
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Listing Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span>
                            {l.city}, {l.region} Region
                          </span>
                        </div>
                        <h3 className="font-bold text-foreground text-base mt-1 line-clamp-1">
                          {l.crop_name}
                        </h3>
                        {l.variety ? (
                          <p className="text-xs text-muted-foreground line-clamp-1">Variety: {l.variety}</p>
                        ) : null}
                      </div>

                      {/* Pricing & Volume */}
                      <div className="rounded-lg bg-muted/40 p-2.5 flex items-baseline justify-between text-xs">
                        <div>
                          <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Unit Price</span>
                          <p className="font-extrabold text-foreground text-base tabular">
                            GH₵ {l.price_per_unit.toFixed(2)}
                            <span className="text-[10px] font-normal text-muted-foreground"> / {l.unit.toLowerCase()}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Available</span>
                          <p className="font-semibold text-foreground tabular">
                            {l.quantity_available.toLocaleString()} {l.unit}
                          </p>
                        </div>
                      </div>

                      {/* Farmer info */}
                      <div className="flex items-center justify-between text-[11px] border-t pt-2 text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          {l.farmer.full_name}
                          {l.farmer.verification_status === "VERIFIED" && (
                            <CheckCircle2 className="size-3 text-primary inline" />
                          )}
                        </span>
                        <Link
                          href={`/marketplace/${l.id}`}
                          className="text-primary hover:underline font-semibold"
                        >
                          Details &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Procurement Action Buttons */}
                  <div className="p-4 pt-0 grid grid-cols-2 gap-2 border-t mt-3 pt-3">
                    <BuyNowDialog
                      listing={{
                        id: l.id,
                        crop_name: l.crop_name,
                        variety: l.variety,
                        unit: l.unit,
                        price_per_unit: l.price_per_unit,
                        quantity_available: l.quantity_available,
                        delivery_available: l.delivery_available,
                        city: l.city,
                        region: l.region,
                      }}
                      userRole={profile.role}
                      isLoggedIn={true}
                    />

                    <MakeOfferDialog
                      listing={{
                        id: l.id,
                        crop_name: l.crop_name,
                        variety: l.variety,
                        unit: l.unit,
                        price_per_unit: l.price_per_unit,
                        quantity_available: l.quantity_available,
                      }}
                      userRole={profile.role}
                      isLoggedIn={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center space-y-4">
            <p className="text-sm font-semibold text-foreground">No produce listings found matching your criteria</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Try adjusting your keyword, region, or quality grade filters, or submit a custom wholesale Buying Request to farmers.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/buyer/marketplace">Clear Filters</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/dashboard/buyer/requests/new">Post a Buying Request</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
