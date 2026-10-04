import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Tag,
  Truck,
} from "lucide-react";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { Button } from "@/components/ui/button";
import { getMarketplaceListingById } from "@/lib/data/marketplace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getMarketplaceListingById(id);
  if (!listing) return { title: "Produce Not Found" };

  return {
    title: `${listing.crop_name} (${listing.quantity_available.toLocaleString()} ${listing.unit}) — Cropo`,
    description: `Buy ${listing.crop_name} harvested in ${listing.city}, ${listing.region}. GH₵ ${listing.price_per_unit.toFixed(2)} per ${listing.unit.toLowerCase()}. Direct farm sourcing on Cropo.`,
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getMarketplaceListingById(id);

  if (!listing) {
    notFound();
  }

  const primaryImage = listing.images[0] || "/images/placeholder-crop.jpg";
  const totalValue = listing.quantity_available * listing.price_per_unit;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb / Back Link */}
          <div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to Marketplace
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Column: Produce Imagery & Detailed Specifications */}
            <div className="lg:col-span-7 space-y-6">
              {/* Main Image */}
              <div className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden rounded-xl border bg-muted shadow-xs">
                <Image
                  src={primaryImage}
                  alt={listing.crop_name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="rounded bg-background/95 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-foreground shadow-xs">
                    Grade {listing.grade}
                  </span>
                  {listing.delivery_available ? (
                    <span className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-xs">
                      <Truck className="size-3" /> Delivery Available
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Additional Images (if any) */}
              {listing.images.length > 1 ? (
                <div className="grid grid-cols-4 gap-3">
                  {listing.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                    >
                      <Image
                        src={img}
                        alt={`${listing.crop_name} photo ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Description & Technical Crop Details */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Harvest Description & Specifications
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {listing.description}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t pt-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Category</span>
                    <p className="font-semibold text-foreground mt-0.5">{listing.category_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Variety</span>
                    <p className="font-semibold text-foreground mt-0.5">{listing.variety || "Standard"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quality Grade</span>
                    <p className="font-semibold text-foreground mt-0.5">Grade {listing.grade}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Harvest Date</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {listing.harvest_date ? new Date(listing.harvest_date).toLocaleDateString() : "Ready"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available Date</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {listing.available_date ? new Date(listing.available_date).toLocaleDateString() : "Immediate"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fulfillment</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {listing.delivery_available ? "Farm Delivery / Pickup" : "Farm Pickup Only"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Standardized Quality Notice */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Standardized Quality & Weight Assurance</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Cropo guarantees calibrated metric weighing upon dispatch. Buyers inspect produce condition
                    prior to order completion.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing, Primary Actions & Farmer Profile */}
            <div className="lg:col-span-5 space-y-6">
              {/* Purchase & Offer Box */}
              <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6 sticky top-24">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3 text-primary" />
                    <span>
                      {listing.city}, {listing.region} Region
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {listing.crop_name}
                  </h1>
                  {listing.variety ? (
                    <p className="text-sm text-muted-foreground">Variety: {listing.variety}</p>
                  ) : null}
                </div>

                {/* Price Display */}
                <div className="rounded-lg border bg-background p-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Unit Price</span>
                    <span className="text-2xl font-extrabold text-foreground tabular">
                      GH₵ {listing.price_per_unit.toFixed(2)}
                      <span className="text-xs font-normal text-muted-foreground"> / {listing.unit.toLowerCase()}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t pt-2 text-muted-foreground">
                    <span>Available Volume</span>
                    <span className="font-semibold text-foreground tabular">
                      {listing.quantity_available.toLocaleString()} {listing.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t pt-2 text-muted-foreground">
                    <span>Total Batch Value</span>
                    <span className="font-semibold text-foreground tabular">
                      GH₵ {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Trade Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button asChild size="lg" className="w-full h-11 text-sm font-semibold">
                    <Link href={`/login?next=/dashboard/buyer`}>
                      Buy Now
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full h-11 text-sm font-semibold">
                    <Link href={`/login?next=/dashboard/buyer`}>
                      <Tag className="mr-2 size-4" />
                      Make Offer
                    </Link>
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Sign in or create a Buyer account to confirm purchase or negotiate terms.
                  </p>
                </div>

                {/* Farmer Card */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Farmer & Farm Origin
                    </h3>
                    <Link
                      href={`/farmers/${listing.farmer.id}`}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      View Profile →
                    </Link>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {listing.farmer.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">{listing.farmer.full_name}</span>
                        {listing.farmer.verification_status === "VERIFIED" ? (
                          <CheckCircle2 className="size-3.5 text-primary" aria-label="Verified Farmer" />
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">{listing.farmer.farm_name}</p>
                      <p className="text-muted-foreground">
                        {listing.farmer.years_farming} years commercial cultivation • {listing.farmer.farm_size}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
