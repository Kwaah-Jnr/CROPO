import Link from "next/link";
import { Scale, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About Cropo — Direct Agricultural Trading in Ghana",
  description:
    "Cropo is building the digital infrastructure for agricultural trade across Ghana and West Africa. Connecting verified farmers with commercial buyers to eliminate post-harvest waste.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header */}
          <div className="text-center space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Mission & Foundation
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              About Cropo
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Modern digital infrastructure connecting Ghanaian agriculture directly to commercial demand.
            </p>
          </div>

          {/* The Problem We Solve */}
          <section className="space-y-4 rounded-xl border bg-card p-6 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              The Agricultural Challenge in Ghana
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Every growing season across Ghana, hardworking farmers cultivate bountiful harvests of tomatoes in
                Akomadan, onions in Bawku, yams in Ejura, and plantains in the Eastern Region. Yet too often,
                growers face an acute dilemma: harvests mature simultaneously, but direct commercial buyers are difficult
                to reach quickly.
              </p>
              <p>
                As a result, perishable produce is sold under distress to informal roadside middlemen at depressed prices,
                or lost to avoidable post-harvest spoilage. Simultaneously, commercial buyers in Accra, Kumasi, and Takoradi —
                including supermarket chains, hotels, restaurants, and food processors — struggle with inconsistent supply,
                unreliable quality, and speculative broker markups.
              </p>
              <p className="font-medium text-foreground">
                Cropo solves this structural gap by giving farmers a direct digital marketplace to list ready harvests, and
                providing commercial buyers with a transparent, verified sourcing channel.
              </p>
            </div>
          </section>

          {/* Core Principles */}
          <section className="space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Our Operating Principles
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Building trust and efficiency into every agricultural trade.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sprout className="size-5" />
                </div>
                <h3 className="text-base font-semibold">Direct Farm-Gate Exchange</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No unnecessary intermediaries. Farmers publish their own pricing and availability, keeping more value
                  in rural farming communities.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Scale className="size-5" />
                </div>
                <h3 className="text-base font-semibold">Standardized Metric Weights</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Replaced arbitrary bag sizes and oversized crates with verified metric kilograms, tonnes, and standard
                  calibrated units.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-base font-semibold">Authentic Verification</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No automated badges. Every verified farmer profile and farm holding is audited before receiving verified
                  standing on our exchange.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6 space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <TrendingUp className="size-5" />
                </div>
                <h3 className="text-base font-semibold">Waste Reduction</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Forward contracting through Buying Requests allows farmers to plant and harvest with confirmed buyer
                  commitments, substantially reducing food loss.
                </p>
              </div>
            </div>
          </section>

          {/* Regional Reach in Ghana */}
          <section className="rounded-xl border bg-card p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Geographic Focus
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Cropo operates across the 16 administrative regions of Ghana, connecting key production belts with major
              commercial consumption centers:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="rounded-md border bg-background p-3">
                <p className="font-semibold text-foreground">Ashanti & Bono</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">Vegetables, Grains, Tubers</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="font-semibold text-foreground">Northern & Upper</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">Onions, Cereals, Legumes</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="font-semibold text-foreground">Eastern & Volta</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">Plantain, Roots, Fruits</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="font-semibold text-foreground">Greater Accra</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">Major Commercial Sourcing</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center space-y-4 pt-4">
            <h3 className="text-2xl font-bold">Partner with Cropo</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Join Ghana&apos;s fastest growing agricultural trading network as a producer or commercial buyer.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/marketplace">Explore Marketplace</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
