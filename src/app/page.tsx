import Link from "next/link";
import { ArrowRight, ShieldCheck, Sprout, TrendingUp } from "lucide-react";

import { SiteHeader } from "@/components/shared/site-header";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Foundation Hero */}
        <section className="border-b bg-card py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sprout className="size-3.5" aria-hidden="true" />
              Agricultural Marketplace for Ghana
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Buy Fresh. Sell Faster. Waste Less.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Direct connection between Ghanaian farmers and commercial buyers. Fair prices, verified produce, and reliable transactions.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">
                  Get Started <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Foundation Highlights */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sprout className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold">For Farmers</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  List your produce before or during harvest. Receive direct offers from verified buyers across Ghana.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <TrendingUp className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold">For Buyers</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Source consistent quality crops directly from farm origin. Post buying requests and negotiate fair prices.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold">Verified Trust</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Community and farm verification ensures authenticity, reliable weights, and dependable order fulfillment.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Ghana.</p>
        </div>
      </footer>
    </div>
  );
}
