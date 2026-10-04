import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Truck,
} from "lucide-react";

import { ListingCard } from "@/components/marketplace/listing-card";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { Button } from "@/components/ui/button";
import { getMarketplaceListings } from "@/lib/data/marketplace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Cropo — Ghana's Agricultural Marketplace",
  description:
    "Buy fresh produce directly from verified Ghanaian farmers. Sell faster, discover fair prices, and reduce post-harvest waste across Ghana.",
};

export default async function HomePage() {
  const listings = await getMarketplaceListings();
  const featuredListings = listings.slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative border-b bg-card py-16 sm:py-24 lg:py-28 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Hero Copy */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
                  <Sprout className="size-3.5" aria-hidden="true" />
                  <span>Ghana Agricultural Trading Platform</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-tight">
                  Buy Fresh. <br className="hidden sm:inline" />
                  Sell Faster. <br className="hidden sm:inline" />
                  <span className="text-primary">Waste Less.</span>
                </h1>

                <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Cropo directly connects commercial farmers with wholesalers, restaurants,
                  retailers, and food processors across Ghana. Transparent farm-gate prices,
                  verified produce grades, and dependable order fulfillment.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button asChild size="lg" className="h-12 px-6 text-sm font-semibold">
                    <Link href="/marketplace">
                      Explore Marketplace <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-6 text-sm font-semibold">
                    <Link href="/signup">Sell on Cropo</Link>
                  </Button>
                </div>

                {/* Practical trust markers */}
                <div className="grid grid-cols-3 gap-4 border-t pt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Verified Farmers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale className="size-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Standardized Weights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Direct Farm Delivery</span>
                  </div>
                </div>
              </div>

              {/* Real Agricultural Hero Photography */}
              <div className="lg:col-span-5 relative">
                <div className="relative aspect-4/3 sm:aspect-5/4 w-full overflow-hidden rounded-xl border bg-muted shadow-md">
                  <Image
                    src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1200&q=80"
                    alt="Fresh harvested red tomatoes sorted in crates ready for Ghanaian markets"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wider text-harvest">
                      Harvest Origin: Akomadan, Ashanti Region
                    </p>
                    <p className="text-sm font-medium text-white/95 mt-0.5">
                      Fresh Pectomech field tomatoes harvested at peak maturity
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARKETPLACE PREVIEW */}
        <section className="py-16 sm:py-20 border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Live Exchange
                </span>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Available Harvests
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Produce ready for purchase or negotiation directly from verified farms.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href="/marketplace">
                  View All Marketplace Listings <ArrowRight className="ml-1.5 size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {featuredListings.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featuredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center space-y-3">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sprout className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">New Harvests Arriving Soon</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Ghanaian farmers are preparing new harvest batches for the exchange. Register to list produce directly or submit a commercial buying request.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Button asChild size="sm">
                    <Link href="/signup">List Produce</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/signup">Post Buying Request</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 sm:py-24 bg-card border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl text-center mx-auto space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Trading Loop
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How Cropo Works
              </h2>
              <p className="text-sm text-muted-foreground">
                A structured, dependable marketplace process for commercial agriculture.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                  1
                </div>
                <h3 className="text-base font-semibold">Farmer Lists Produce</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Farmers specify crop variety, available quantity, standardized unit, harvest date, location, and farm-gate price.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                  2
                </div>
                <h3 className="text-base font-semibold">Buyer Discovers Harvest</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Commercial buyers filter by crop, origin region, grade, and volume, inspecting verified farmer records.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                  3
                </div>
                <h3 className="text-base font-semibold">Purchase or Offer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Buyers purchase instantly with <em>Buy Now</em>, or negotiate price and volume using <em>Make Offer</em>.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                  4
                </div>
                <h3 className="text-base font-semibold">Fulfillment & Delivery</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The order transitions through controlled preparation, dispatch, inspection, and completion stages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOR FARMERS & FOR BUYERS COMPARISON */}
        <section className="py-16 sm:py-24 border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* For Farmers */}
              <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6">
                <div className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sprout className="size-6" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">For Farmers & Agricultural Cooperatives</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Stop selling under distress at roadside aggregations. List your produce ahead of harvest to lock in verified commercial buyers.
                  </p>
                </div>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Direct access to wholesalers, retailers, and food processors in major Ghanaian cities.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Receive and counter-offer purchase proposals on your own schedule.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Respond to custom Buying Requests posted by commercial buyers needing specific volumes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Build a verified reputation backed by your farm credentials.</span>
                  </li>
                </ul>
                <div>
                  <Button asChild size="sm">
                    <Link href="/signup">Register as a Farmer</Link>
                  </Button>
                </div>
              </div>

              {/* For Buyers */}
              <div className="rounded-xl border bg-card p-6 sm:p-8 space-y-6">
                <div className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingBag className="size-6" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">For Commercial Buyers & Processors</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Secure consistent supply volumes directly from farm source without broker price gouging or inconsistent weights.
                  </p>
                </div>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Filter produce by origin region, certified harvest date, and quality grade (A, B, C).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Post public Buying Requests when you need specific tonnage and dates.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Save verified suppliers for recurring orders across growing seasons.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Track multi-stage fulfillment from farm preparation to delivery.</span>
                  </li>
                </ul>
                <div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/signup">Register as a Buyer</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST & VERIFICATION EXPLANATION */}
        <section className="py-16 sm:py-24 bg-card border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl text-center mx-auto space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Integrity Standard
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Real Verification. No Artificial Claims.
              </h2>
              <p className="text-sm text-muted-foreground">
                We do not fabricate ratings or user counts. Every trust badge represents an audited administrative verification.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-6 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                  <ShieldCheck className="size-5 text-primary" />
                  <span>Verified Farmer</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Farmer identity and community standing are reviewed by administrators before granting the verified status badge.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-6 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                  <FileCheck2 className="size-5 text-primary" />
                  <span>Farm Verified</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Registered acreage, district location, and operational capacity verified through physical or documentation audits.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-6 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                  <Scale className="size-5 text-primary" />
                  <span>Standardized Units</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Strictly controlled units (Kilograms, Tonnes, standard crates, bags) eliminate arbitrary measurement disputes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="py-16 sm:py-20 text-center">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to trade agricultural produce directly?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Join farmers, food processors, and wholesalers building a more reliable, transparent agricultural marketplace for Ghana.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/marketplace">Explore Marketplace</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/signup">Sell on Cropo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
