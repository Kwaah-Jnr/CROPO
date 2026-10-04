import Link from "next/link";
import { Clock, MapPin, Package, ShoppingBag, Truck } from "lucide-react";

import { StatusBadge } from "@/components/farmer/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getFarmerOrders } from "@/lib/data/farmer";

export const metadata = {
  title: "Fulfillment Orders — Farmer Dashboard | Cropo",
  description: "Track and manage agricultural fulfillment orders from commercial buyers.",
};

export default async function FarmerOrdersPage() {
  const profile = await requireRole("FARMER");
  const orders = await getFarmerOrders(profile.id);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <PageHeader
          title="Fulfillment Orders"
          description="Track incoming orders through harvesting, preparation, dispatch, and final completion."
        />
      </div>

      {orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border bg-card p-5 space-y-4 shadow-xs"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm font-mono">{order.order_number}</span>
                      <span className="text-[11px] rounded bg-muted px-2 py-0.5 text-muted-foreground uppercase font-medium">
                        {order.source}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Buyer: {order.buyer_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <StatusBadge status={order.status} />
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Items & Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Items */}
                <div className="space-y-1">
                  <span className="text-muted-foreground">Order Items</span>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <p key={item.id} className="font-semibold text-foreground">
                        {item.crop_name} — {item.quantity.toLocaleString()} {item.unit} @ GH₵{" "}
                        {item.price_per_unit.toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Fulfillment Method */}
                <div className="space-y-1">
                  <span className="text-muted-foreground">Fulfillment Mode</span>
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    {order.delivery_method === "DELIVERY" ? (
                      <>
                        <Truck className="size-3.5 text-primary" /> Delivery to Buyer
                      </>
                    ) : (
                      <>
                        <MapPin className="size-3.5 text-primary" /> Farm Gate Pickup
                      </>
                    )}
                  </p>
                  {order.delivery_address ? (
                    <p className="text-[11px] text-muted-foreground truncate">{order.delivery_address}</p>
                  ) : null}
                </div>

                {/* Total Value */}
                <div className="space-y-1 sm:text-right">
                  <span className="text-muted-foreground">Total Order Amount</span>
                  <p className="text-lg font-bold text-foreground tabular">
                    GH₵ {order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Currency: {order.currency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No fulfillment orders yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When commercial buyers purchase your listings directly or accept your negotiated terms, orders will advance through preparation and delivery here.
            </p>
          </div>
          <div>
            <Button asChild size="sm">
              <Link href="/dashboard/farmer/listings">View My Listings</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
