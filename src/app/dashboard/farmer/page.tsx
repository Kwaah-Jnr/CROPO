import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  PlusCircle,
  ShoppingBag,
  Sprout,
  Tag,
  Wallet,
} from "lucide-react";

import { MetricCard } from "@/components/farmer/metric-card";
import { StatusBadge } from "@/components/farmer/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getFarmerDashboardOverview } from "@/lib/data/farmer";

export const metadata = {
  title: "Farmer Dashboard — Cropo",
  description: "Monitor your harvest listings, pending offers, active orders, and farm revenue on Cropo.",
};

export default async function FarmerDashboardPage() {
  const profile = await requireRole("FARMER");
  const data = await getFarmerDashboardOverview(profile.id);

  return (
    <div className="space-y-8">
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageHeader
            title={`Welcome, ${profile.full_name}`}
            description="Manage your harvest listings, review commercial buyer offers, and track order fulfillment across Ghana."
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm">
            <Link href="/dashboard/farmer/listings/new">
              <PlusCircle className="mr-1.5 size-4" /> List New Produce
            </Link>
          </Button>
        </div>
      </div>

      {/* VERIFICATION BANNER */}
      {data.verificationStatus === "VERIFIED" ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs">
          <CheckCircle2 className="size-5 text-primary shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">Verified Farmer Standing</p>
            <p className="text-muted-foreground">
              Your farmer identity and primary farm holding are authenticated. Your produce listings display the Verified Farmer badge to all commercial buyers.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">
                Account Status: {data.verificationStatus === "PENDING" ? "Verification In Review" : "Unverified Farmer Profile"}
              </p>
              <p className="text-muted-foreground">
                {data.verificationStatus === "PENDING"
                  ? "Your verification credentials are being reviewed by Cropo administration."
                  : "Submit your national identity and farm holding details to receive the Verified Farmer trust badge."}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="xs" className="shrink-0 self-start sm:self-center">
            <Link href="/dashboard/farmer/verification">View Verification Requirements</Link>
          </Button>
        </div>
      )}

      {/* 4 SUMMARY METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Listings"
          value={data.activeListingsCount}
          subtitle={`${data.totalListingsCount} total batches registered`}
          icon={Sprout}
        />
        <MetricCard
          title="Incoming Offers"
          value={data.pendingOffersCount}
          subtitle="Awaiting your response"
          icon={Tag}
        />
        <MetricCard
          title="Active Orders"
          value={data.activeOrdersCount}
          subtitle={
            data.pendingOrderValue > 0
              ? `GH₵ ${data.pendingOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} in progress`
              : "No orders in fulfillment"
          }
          icon={ShoppingBag}
        />
        <MetricCard
          title="Realized Sales"
          value={`GH₵ ${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle={`${data.completedOrdersCount} completed orders`}
          icon={Wallet}
        />
      </div>

      {/* TWO COLUMN GRID: RECENT LISTINGS & RECENT OFFERS */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* RECENT LISTINGS */}
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Your Produce Listings</h2>
              <p className="text-xs text-muted-foreground">Active batches available on marketplace</p>
            </div>
            <Link
              href="/dashboard/farmer/listings"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              All Listings <ArrowRight className="size-3" />
            </Link>
          </div>

          {data.recentListings.length > 0 ? (
            <div className="divide-y text-xs">
              {data.recentListings.map((listing) => (
                <div key={listing.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-sm">{listing.crop_name}</p>
                    <p className="text-muted-foreground">
                      {listing.quantity_available.toLocaleString()} {listing.unit} • GH₵ {listing.price_per_unit.toFixed(2)}/{listing.unit.toLowerCase()} • Grade {listing.grade}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={listing.status} />
                    <Button asChild variant="ghost" size="xs">
                      <Link href={`/dashboard/farmer/listings/${listing.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Sprout className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No Produce Listed Yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  List your upcoming or harvested produce to start receiving commercial purchase requests.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/dashboard/farmer/listings/new">List Produce Now</Link>
              </Button>
            </div>
          )}
        </div>

        {/* RECENT OFFERS */}
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Incoming Purchase Offers</h2>
              <p className="text-xs text-muted-foreground">Proposals from verified commercial buyers</p>
            </div>
            <Link
              href="/dashboard/farmer/offers"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              All Offers <ArrowRight className="size-3" />
            </Link>
          </div>

          {data.recentOffers.length > 0 ? (
            <div className="divide-y text-xs">
              {data.recentOffers.map((offer) => (
                <div key={offer.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{offer.buyer_name}</span>
                      <StatusBadge status={offer.status} />
                    </div>
                    <p className="text-muted-foreground">
                      For: {offer.crop_name} • {offer.quantity.toLocaleString()} {offer.unit} @ GH₵ {offer.price_per_unit.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground tabular">
                      GH₵ {(offer.quantity * offer.price_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                      <Clock className="size-2.5" />
                      {new Date(offer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Tag className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">No Incoming Offers</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                When buyers make custom quantity and price proposals on your produce, they will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
