import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Inbox, MapPin, Calendar, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getBuyerRequests } from "@/lib/data/buyer";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Buying Requests (RFQs) | Cropo Buyer",
  description: "Manage your commercial requests for quotation and review farmer responses.",
};

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "Fulfilled", value: "FULFILLED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default async function BuyerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRole("BUYER");
  if (!profile) redirect("/login");

  const { status = "ALL" } = await searchParams;
  const requests = await getBuyerRequests(profile.id, status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Buying Requests (RFQs)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish requirements to regional farmers and review competitive quotes.
          </p>
        </div>
        <Link href="/dashboard/buyer/requests/new">
          <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Request (RFQ)
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
              href={`/dashboard/buyer/requests${tab.value === "ALL" ? "" : `?status=${tab.value}`}`}
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

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/50">
          <Inbox className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No buying requests found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {status === "ALL"
              ? "You haven't posted any produce buying requests yet. Submit an RFQ to receive direct price quotes from verified farmers."
              : `You have no buying requests matching filter "${status}".`}
          </p>
          <div className="mt-6">
            <Link href="/dashboard/buyer/requests/new">
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                <Plus className="h-4 w-4 mr-1.5" />
                Post Your First Request
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border/80 bg-card p-5 hover:border-emerald-600/30 transition-all shadow-xs"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base text-foreground font-display">
                      {r.crop_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                      {r.category_name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        r.status === "OPEN"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : r.status === "FULFILLED"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : r.status === "CLOSED"
                          ? "bg-stone-100 text-stone-700 border border-stone-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="font-medium text-foreground">
                      Volume: {r.quantity.toLocaleString()} {r.unit}
                    </span>
                    {r.desired_grade && (
                      <span>Grade: {r.desired_grade}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.destination_region}{r.destination_city ? `, ${r.destination_city}` : ""}
                    </span>
                    {r.required_by && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Needed by: {new Date(r.required_by).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {r.target_price_per_unit && (
                    <div className="text-xs text-stone-600">
                      Target Budget: <span className="font-semibold text-emerald-800">GH₵{r.target_price_per_unit.toFixed(2)}</span> / {r.unit}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-foreground">
                      {r.offersCount} {r.offersCount === 1 ? "Farmer Quote" : "Farmer Quotes"}
                    </div>
                    {r.pendingOffersCount > 0 && (
                      <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                        {r.pendingOffersCount} awaiting review
                      </span>
                    )}
                  </div>

                  <Link href={`/dashboard/buyer/requests/${r.id}`}>
                    <Button variant="outline" size="sm" className="h-9 px-3 gap-1 text-xs">
                      View Details
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
