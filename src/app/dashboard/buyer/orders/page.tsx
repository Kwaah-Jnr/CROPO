import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag, ChevronRight, Calendar, MapPin, Truck, ArrowUpRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getBuyerOrders } from "@/lib/data/buyer";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "My Orders | Cropo Buyer",
  description: "Track procurement orders, fulfillment statuses, and delivery milestones.",
};

const TABS = [
  { label: "All Orders", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "Pending Farmer Acceptance", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    case "ACCEPTED":
      return { label: "Farmer Accepted", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "CONFIRMED":
      return { label: "Confirmed", bg: "bg-teal-50 text-teal-800 border-teal-200" };
    case "PREPARING":
      return { label: "Preparing Produce", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
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

export default async function BuyerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRole("BUYER");
  if (!profile) redirect("/login");

  const { status = "ALL" } = await searchParams;
  const orders = await getBuyerOrders(profile.id, status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Commercial Orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your purchase orders, monitor harvest preparation, and verify delivery.
          </p>
        </div>
        <Link href="/dashboard/buyer/marketplace">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
            New Procurement
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 overflow-x-auto pb-px">
        {TABS.map((tab) => {
          const isActive = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/dashboard/buyer/orders${tab.value === "ALL" ? "" : `?status=${tab.value}`}`}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/50">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No orders found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {status === "ALL"
              ? "You haven't initiated any orders yet. Purchase produce instantly via Buy Now or negotiate custom deals via Make Offer."
              : `You have no orders matching "${status}".`}
          </p>
          <div className="mt-6">
            <Link href="/dashboard/buyer/marketplace">
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                Browse Marketplace Produce
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const totalItemsCount = order.items.reduce((sum: number, it: { quantity: number }) => sum + it.quantity, 0);
            const primaryItemName = order.items[0]?.crop_name || "Produce";

            return (
              <div
                key={order.id}
                className="rounded-xl border border-border/80 bg-card p-5 hover:border-emerald-600/30 transition-all shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-base text-foreground font-display">
                        Order #{order.order_number}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded uppercase tracking-wider">
                        {order.source.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">
                        {order.items.length > 1
                          ? `${primaryItemName} + ${order.items.length - 1} more (${totalItemsCount.toLocaleString()} total units)`
                          : `${primaryItemName} &bull; ${order.items[0]?.quantity.toLocaleString()} ${order.items[0]?.unit}`}
                      </span>
                      <span>
                        Farmer: <strong className="text-foreground">{order.farmer.name}</strong>
                      </span>
                      {order.farmer.region && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.farmer.region}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {order.delivery_method}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Order Total</div>
                      <div className="text-base font-bold text-foreground">
                        GH₵{order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <Link href={`/dashboard/buyer/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="h-9 px-3 gap-1 text-xs">
                        View Details
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
