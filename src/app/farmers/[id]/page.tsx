import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";

import { ListingCard } from "@/components/marketplace/listing-card";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { Button } from "@/components/ui/button";
import { getFarmerProfileById } from "@/lib/data/marketplace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getFarmerProfileById(id);
  if (!data) return { title: "Farmer Not Found" };

  return {
    title: `${data.farmer.full_name} — Verified Farmer Profile | Cropo`,
    description: `${data.farmer.full_name} farming in ${data.farmer.city}, ${data.farmer.region}. ${data.farmer.years_farming} years experience. View active produce listings on Cropo.`,
  };
}

export default async function FarmerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getFarmerProfileById(id);

  if (!data) {
    notFound();
  }

  const { farmer, listings } = data;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb */}
          <div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to Marketplace
            </Link>
          </div>

          {/* Farmer Header Card */}
          <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold shrink-0">
                  {farmer.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{farmer.full_name}</h1>
                    {farmer.verification_status === "VERIFIED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        <CheckCircle2 className="size-3.5" /> Verified Farmer
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 text-primary" />
                    <span>
                      {farmer.city}, {farmer.region} Region, Ghana
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button asChild size="sm">
                  <Link href="/signup">Contact via Cropo</Link>
                </Button>
              </div>
            </div>

            {/* Farmer Experience & Farm Holdings */}
            <div className="grid gap-6 sm:grid-cols-3 border-t pt-6 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Primary Farm</span>
                <p className="font-semibold text-foreground text-sm">{farmer.farm_name}</p>
                <p className="text-muted-foreground">{farmer.farm_size}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Cultivation Experience</span>
                <p className="font-semibold text-foreground text-sm">{farmer.years_farming} Years</p>
                <p className="text-muted-foreground">Commercial Agriculture</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Active Listings</span>
                <p className="font-semibold text-foreground text-sm">{listings.length} Harvest Batches</p>
                <p className="text-muted-foreground">Direct from field</p>
              </div>
            </div>

            {/* Bio */}
            {farmer.bio ? (
              <div className="border-t pt-4 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Farmer Background
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">{farmer.bio}</p>
              </div>
            ) : null}
          </div>

          {/* Active Produce Listings */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Current Produce from this Farmer
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available batches harvested or ready for fulfillment
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {listings.length} {listings.length === 1 ? "batch" : "batches"}
              </span>
            </div>

            {listings.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-xs text-muted-foreground">
                No active listings from this farmer currently.
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
