import Link from "next/link";
import {
  GitBranch,
  ShoppingBag,
  Tag,
} from "lucide-react";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "How Cropo Works — Agricultural Trade & Fulfillment Process",
  description:
    "Learn how farmers and commercial buyers trade on Cropo. Understand our 3 transaction methods, controlled order state machine, and quality grading standards.",
};

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header */}
          <div className="text-center space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Operational Guide
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              How Cropo Works
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              A transparent, dependable marketplace platform designed specifically for commercial agriculture in Ghana and West Africa.
            </p>
          </div>

          {/* THREE TRANSACTION METHODS */}
          <section className="space-y-8">
            <div className="border-b pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Commerce Models
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                Three Ways to Transact
              </h2>
              <p className="text-sm text-muted-foreground">
                Flexible trade mechanisms adapted to real farm conditions and wholesale sourcing needs.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* Buy Now */}
              <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingBag className="size-5" />
                </div>
                <h3 className="text-lg font-bold">1. Buy Now</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Direct purchase at the farmer&apos;s listed farm-gate price. The buyer selects quantity,
                  specifies delivery or pickup, and the order is instantly initialized into the fulfillment pipeline.
                </p>
                <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Best for:</span> Immediate harvest purchases and standard commercial transactions.
                </div>
              </div>

              {/* Make Offer */}
              <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Tag className="size-5" />
                </div>
                <h3 className="text-lg font-bold">2. Make Offer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Buyers propose a tailored volume and target price per unit. The farmer can review the terms,
                  accept, or reject. When accepted, an order is automatically generated at the agreed price.
                </p>
                <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Best for:</span> Bulk wholesale volumes, recurring institutional contracts, or multi-tonne negotiations.
                </div>
              </div>

              {/* Buyer Request */}
              <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GitBranch className="size-5" />
                </div>
                <h3 className="text-lg font-bold">3. Buying Request</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Buyers post public demand specifying crop variety, target destination, required tonnage, and required delivery date.
                  Verified farmers discover the request and submit competitive supply offers.
                </p>
                <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Best for:</span> Processors, supermarkets, and catering companies sourcing large forward contracts.
                </div>
              </div>
            </div>
          </section>

          {/* CONTROLLED ORDER STATE MACHINE */}
          <section className="space-y-8 rounded-xl border bg-card p-6 sm:p-8 shadow-xs">
            <div className="border-b pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Integrity & Governance
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                The 4-Stage Controlled Order Lifecycle
              </h2>
              <p className="text-sm text-muted-foreground">
                Every trade advances through strictly enforced database milestones. Neither party can jump stages or alter history. The architecture enforces 11 exact backend states:
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">STAGE 1</span>
                  <div className="flex gap-1 text-[10px] font-mono text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">PENDING</span>
                    <span className="rounded bg-muted px-1.5 py-0.5">ACCEPTED</span>
                  </div>
                </div>
                <h4 className="text-sm font-semibold">Initiation & Agreement</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Buy Now begins as <code className="font-mono text-foreground font-semibold">PENDING</code> until the farmer accepts or declines (<code className="font-mono text-foreground">REJECTED</code>). Offer and Request trades begin immediately as <code className="font-mono text-foreground font-semibold">ACCEPTED</code>. Once logistics terms are locked, both parties advance the order to <code className="font-mono text-foreground font-semibold">CONFIRMED</code>.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">STAGE 2</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">PREPARING</span>
                </div>
                <h4 className="text-sm font-semibold">Harvest & Packaging</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Produce enters the <code className="font-mono text-foreground font-semibold">PREPARING</code> state. The farmer harvests, grades by standard specifications (Grade A, B, C), calibrates metric weights, and packs into designated crates or sacks.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">STAGE 3</span>
                  <div className="flex gap-1 text-[10px] font-mono text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">PICKUP</span>
                    <span className="rounded bg-muted px-1.5 py-0.5">IN_TRANSIT</span>
                  </div>
                </div>
                <h4 className="text-sm font-semibold">Dispatch & Haulage</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  For self-collection, the order transitions to <code className="font-mono text-foreground font-semibold">READY_FOR_PICKUP</code> at the farm gate. For haulage delivery, it transitions to <code className="font-mono text-foreground font-semibold">IN_TRANSIT</code> upon carrier loading.
                </p>
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">STAGE 4</span>
                  <div className="flex gap-1 text-[10px] font-mono text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">DELIVERED</span>
                    <span className="rounded bg-muted px-1.5 py-0.5">COMPLETED</span>
                  </div>
                </div>
                <h4 className="text-sm font-semibold">Receipt & Completion</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upon arrival, produce is marked <code className="font-mono text-foreground font-semibold">DELIVERED</code>. The buyer physically inspects produce quality and verifies weight. When confirmed satisfactory, the order is marked <code className="font-mono text-foreground font-semibold">COMPLETED</code>.
                </p>
              </div>
            </div>

            {/* Safeguard & Exception States */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-xs">
              <span className="font-semibold text-foreground text-xs uppercase tracking-wider">
                Safeguard & Exception States (CANCELLED, REJECTED, DISPUTED)
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Orders can only be <code className="font-mono text-foreground">CANCELLED</code> prior to preparation according to cancellation rules. If the farmer cannot fulfill an initial Buy Now order, it is marked <code className="font-mono text-foreground">REJECTED</code>. If delivered produce fails quality or weight verification, either party can open a <code className="font-mono text-foreground">DISPUTED</code> claim, pausing funds until an administrative mediator inspects proof and resolves the order to <code className="font-mono text-foreground">COMPLETED</code> or <code className="font-mono text-foreground">CANCELLED</code>.
              </p>
            </div>
          </section>

          {/* QUALITY GRADING STANDARDS */}
          <section className="space-y-8">
            <div className="border-b pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Quality Assurance
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                Produce Grading Standards
              </h2>
              <p className="text-sm text-muted-foreground">
                To eliminate ambiguity and price discrepancies, all listings on Cropo utilize clear grade definitions.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-5 space-y-2">
                <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  Grade A — Premium
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Uniform size, peak maturity, free from skin blemishes, bruising, or pest marks. Ideal for retail supermarkets, export aggregators, and hospitality kitchens.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-5 space-y-2">
                <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                  Grade B — Standard
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Good commercial quality with minor cosmetic size or shape variations. Wholesome produce suitable for municipal wholesale markets and neighborhood distribution.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-5 space-y-2">
                <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-bold text-foreground">
                  Grade C — Processing
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Variable sizing or cosmetic marks, fully nutritious and sound. Perfect for industrial juice extraction, tomato paste canning, drying, and starch milling.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-xl border bg-card p-8 text-center space-y-4">
            <h3 className="text-xl font-bold">Start trading on Cropo today</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
              Join farmers, food processors, and commercial buyers trading authentic produce across Ghana.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="sm">
                <Link href="/marketplace">Browse Marketplace</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
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
