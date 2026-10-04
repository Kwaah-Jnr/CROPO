import Link from "next/link";
import {
  ArrowRight,
  FilePlus,
  FileText,
  Globe,
  Plus,
  ShoppingBag,
  Store,
  Tag,
} from "lucide-react";

import { StatusBadge } from "@/components/farmer/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getBuyerDashboardOverview } from "@/lib/data/buyer";

export const metadata = {
  title: "Commercial Buyer Dashboard — Cropo",
  description: "Manage agricultural sourcing orders, supplier offers, and buying requests across Ghana.",
};

export default async function BuyerDashboardPage() {
  const profile = await requireRole("BUYER");
  const data = await getBuyerDashboardOverview(profile.id);

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <PageHeader
          title={`Procurement Hub — ${profile.full_name}`}
          description="Source directly from verified Ghanaian farmers. Manage orders, offers, and wholesale buying requests."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/buyer/marketplace">
              <Globe className="mr-1.5 size-3.5 text-primary" /> Browse Marketplace
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/buyer/requests/new">
              <Plus className="mr-1.5 size-3.5" /> Post Buying Request
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Orders */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Active Orders</span>
            <ShoppingBag className="size-4 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground tabular">
            {data.activeOrdersCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">In negotiation, transit or ready for pickup</p>
        </div>

        {/* Open Buying Requests */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Open Buying Requests</span>
            <FileText className="size-4 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground tabular">
            {data.openRequestsCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Active RFQs open to verified farmers</p>
        </div>

        {/* Pending Offers Sent */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Pending Offers</span>
            <Tag className="size-4 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground tabular">
            {data.pendingOffersCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting farmer acceptance</p>
        </div>

        {/* Total Sourced Value */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Total Completed Sourcing</span>
            <Store className="size-4 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground tabular">
            GH₵ {data.totalSourcedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Settled metric volume</p>
        </div>
      </div>

      {/* Grid: Recent Orders & Recent Requests */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders Box */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Recent Procurement Orders</h2>
            </div>
            <Link
              href="/dashboard/buyer/orders"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all ({data.activeOrdersCount}) <ArrowRight className="size-3" />
            </Link>
          </div>

          {data.recentOrders.length > 0 ? (
            <div className="divide-y text-xs">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{order.crop_name}</span>
                      <span className="text-muted-foreground">
                        ({order.quantity.toLocaleString()} {order.unit})
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Farmer: {order.farmer_name} • Order: {order.order_number}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-foreground tabular">
                      GH₵ {order.subtotal.toFixed(2)}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No active orders placed yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/buyer/marketplace">Source Produce Now</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Open Buying Requests Box */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">My Buying Requests (RFQs)</h2>
            </div>
            <Link
              href="/dashboard/buyer/requests"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all ({data.openRequestsCount}) <ArrowRight className="size-3" />
            </Link>
          </div>

          {data.recentRequests.length > 0 ? (
            <div className="divide-y text-xs">
              {data.recentRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/dashboard/buyer/requests/${req.id}`}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-sm px-1"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{req.crop_name}</span>
                      <span className="text-muted-foreground">
                        ({req.quantity.toLocaleString()} {req.unit})
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Destination: {req.destination_region} Region
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                      {req.offers_count} {req.offers_count === 1 ? "quote" : "quotes"} received
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No open buying requests posted.</p>
              <Button asChild size="sm">
                <Link href="/dashboard/buyer/requests/new">
                  <FilePlus className="mr-1.5 size-3.5" /> Post Your First Request
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sent Offers */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Recent Produce Offers Sent</h2>
          </div>
          <Link
            href="/dashboard/buyer/offers"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            View all offers <ArrowRight className="size-3" />
          </Link>
        </div>

        {data.recentOffers.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-lg border bg-muted/20 p-4 space-y-2 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{offer.crop_name}</span>
                    <StatusBadge status={offer.status} />
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Farmer: {offer.farmer_name}</p>
                </div>
                <div className="border-t pt-2 flex items-baseline justify-between text-muted-foreground">
                  <span>
                    {offer.quantity.toLocaleString()} {offer.unit}
                  </span>
                  <span className="font-bold text-foreground text-sm tabular">
                    GH₵ {offer.price_per_unit.toFixed(2)} / {offer.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No price offers submitted to farmers yet.
          </div>
        )}
      </div>
    </div>
  );
}
