import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getBuyerOrderById } from "@/lib/data/buyer";

export const metadata = {
  title: "Order Details | Cropo Buyer",
  description: "View order items, delivery specifications, and status history.",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "Pending Farmer Acceptance", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    case "ACCEPTED":
      return { label: "Farmer Accepted", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "CONFIRMED":
      return { label: "Confirmed", bg: "bg-teal-50 text-teal-800 border-teal-200" };
    case "PREPARING":
      return { label: "Preparing Harvest", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    case "READY_FOR_PICKUP":
      return { label: "Ready for Pickup", bg: "bg-sky-50 text-sky-800 border-sky-200" };
    case "IN_TRANSIT":
      return { label: "In Transit", bg: "bg-blue-50 text-blue-800 border-blue-200" };
    case "DELIVERED":
      return { label: "Delivered", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "COMPLETED":
      return { label: "Completed", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "CANCELLED":
      return { label: "Cancelled", bg: "bg-stone-100 text-stone-700 border-stone-200" };
    case "DISPUTED":
      return { label: "In Dispute", bg: "bg-orange-50 text-orange-800 border-orange-200" };
    case "REJECTED":
      return { label: "Declined", bg: "bg-rose-50 text-rose-800 border-rose-200" };
    default:
      return { label: status, bg: "bg-stone-100 text-stone-700 border-stone-200" };
  }
}

export default async function BuyerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole("BUYER");
  if (!profile) redirect("/login");

  const { id } = await params;
  const order = await getBuyerOrderById(id, profile.id);

  if (!order) {
    notFound();
  }

  const badge = getStatusBadge(order.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/buyer/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
                Order #{order.order_number}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Initiated via {order.source.replace("_", " ")} on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Order Total</span>
            <span className="text-xl font-bold text-foreground">
              GH₵{order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items and Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Card */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-border/60 bg-stone-50/50">
              <h2 className="text-sm font-semibold text-foreground font-display">
                Ordered Produce Items ({order.items.length})
              </h2>
            </div>
            <div className="divide-y divide-border/60">
              {order.items.map((it: { id: string; listing_id: string; crop_name: string; quantity: number; unit: string; price_per_unit: number; line_total: number }) => (
                <div key={it.id} className="p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Link
                      href={`/marketplace/${it.listing_id}`}
                      className="text-sm font-bold text-foreground hover:text-emerald-800 transition-colors font-display"
                    >
                      {it.crop_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Quantity: <strong className="text-foreground">{it.quantity.toLocaleString()} {it.unit}</strong> @ GH₵{it.price_per_unit.toFixed(2)} / {it.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">
                      GH₵{it.line_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 bg-stone-50/60 border-t border-border/60 flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Subtotal</span>
              <span className="font-bold text-base text-foreground">
                GH₵{order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Fulfillment & Delivery Details */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground font-display mb-4">
              Fulfillment & Delivery
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                <span className="text-muted-foreground block mb-1">Fulfillment Method</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-stone-600" />
                  {order.delivery_method === "PICKUP"
                    ? "Buyer Pickup from Farm"
                    : "Farmer Direct Delivery"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                <span className="text-muted-foreground block mb-1">Assigned Farmer</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  {order.farmer.name}
                </span>
                {order.farmer.region && (
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {order.farmer.region}{order.farmer.city ? `, ${order.farmer.city}` : ""}
                  </span>
                )}
              </div>
            </div>

            {order.delivery_address && (
              <div className="mt-4 pt-4 border-t border-border/60 text-xs">
                <span className="text-muted-foreground block mb-1">Delivery Address:</span>
                <p className="text-foreground bg-stone-50/60 p-2.5 rounded border border-stone-100">
                  {order.delivery_address}
                </p>
              </div>
            )}

            {order.notes && (
              <div className="mt-3 text-xs">
                <span className="text-muted-foreground block mb-1">Order Notes:</span>
                <p className="text-foreground bg-stone-50/60 p-2.5 rounded border border-stone-100 italic">
                  &ldquo;{order.notes}&rdquo;
                </p>
              </div>
            )}

            {order.cancel_reason && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <span className="font-semibold block mb-0.5">Cancellation Reason:</span>
                {order.cancel_reason}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Lifecycle Timeline */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground font-display mb-4">
              Order Lifecycle Status
            </h2>

            {order.statusHistory.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                <p>Status: <strong className="text-foreground">{order.status}</strong></p>
                <p className="mt-1">Order record created on {new Date(order.created_at).toLocaleDateString()}.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {order.statusHistory.map((step: { id?: string; to_status: string; note?: string | null; created_at: string }, idx: number) => (
                  <div key={step.id || idx} className="relative">
                    <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-emerald-600 border-2 border-background flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {step.to_status}
                      </span>
                      {step.note && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {step.note}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground/75 block mt-0.5">
                        {new Date(step.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border/60 text-[11px] text-muted-foreground flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-emerald-800 shrink-0 mt-0.5" />
              <span>
                Fulfillment workflow transitions (Preparing, In Transit, Delivery Confirmation) are logged transparently on Cropo.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
