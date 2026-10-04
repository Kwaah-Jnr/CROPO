import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ShieldCheck,
  Package,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getBuyerRequestById } from "@/lib/data/buyer";
import { RequestOfferActionButtons } from "@/components/buyer/request-offer-action-buttons";
import { CancelRequestButton } from "@/components/buyer/cancel-request-button";

export const metadata = {
  title: "Request Details | Cropo Buyer",
  description: "View buying request details and review farmer quotes.",
};

export default async function BuyerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole("BUYER");
  if (!profile) redirect("/login");

  const { id } = await params;
  const request = await getBuyerRequestById(id, profile.id);

  if (!request) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/buyer/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Buying Requests
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
                {request.crop_name}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  request.status === "OPEN"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : request.status === "FULFILLED"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : request.status === "CLOSED"
                    ? "bg-stone-100 text-stone-700 border border-stone-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {request.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Posted on {new Date(request.created_at).toLocaleDateString()} &bull; Category: {request.category_name}
            </p>
          </div>

          {request.status === "OPEN" && (
            <CancelRequestButton requestId={request.id} />
          )}
        </div>
      </div>

      {/* Specifications Card */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 font-display">
          Requirement Specifications
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
            <span className="text-muted-foreground block mb-1">Required Volume</span>
            <span className="text-sm font-bold text-foreground">
              {request.quantity.toLocaleString()} {request.unit}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
            <span className="text-muted-foreground block mb-1">Target Budget</span>
            <span className="text-sm font-bold text-emerald-800">
              {request.target_price_per_unit
                ? `GH₵${request.target_price_per_unit.toFixed(2)} / ${request.unit}`
                : "Open to Quotes"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
            <span className="text-muted-foreground block mb-1">Desired Quality</span>
            <span className="text-sm font-bold text-foreground">
              {request.desired_grade ? `Grade ${request.desired_grade}` : "Standard"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
            <span className="text-muted-foreground block mb-1">Required By</span>
            <span className="text-sm font-bold text-foreground">
              {request.required_by
                ? new Date(request.required_by).toLocaleDateString()
                : "Flexible"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-stone-500" />
            <span>Delivery Destination: <strong className="text-foreground">{request.destination_region}{request.destination_city ? `, ${request.destination_city}` : ""}</strong></span>
          </div>
        </div>

        {request.description && (
          <div className="mt-4 pt-4 border-t border-border/60 text-xs">
            <span className="text-muted-foreground block mb-1">Buyer Notes & Instructions:</span>
            <p className="text-foreground bg-stone-50/60 p-3 rounded-md border border-stone-100 whitespace-pre-wrap">
              {request.description}
            </p>
          </div>
        )}
      </div>

      {/* Received Quotes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground font-display">
            Farmer Quotes & Offers ({request.offers.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Direct response quotes submitted by verified producers
          </span>
        </div>

        {request.offers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center bg-card/40">
            <Package className="h-9 w-9 text-muted-foreground/50 mx-auto mb-2.5" />
            <h3 className="text-sm font-semibold text-foreground">No farmer quotes received yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Your buying request is broadcasted to verified producers in {request.destination_region} and surrounding areas. Quotes submitted by farmers will appear here for your review and one-click order confirmation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {request.offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-emerald-600/30"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {offer.farmer.name}
                      </span>
                      {offer.farmer.verification_status === "VERIFIED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          <ShieldCheck className="h-3 w-3" />
                          Verified Producer
                        </span>
                      )}
                      {offer.farmer.region && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {offer.farmer.region}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs flex-wrap">
                      <div>
                        <span className="text-muted-foreground">Offered Volume: </span>
                        <strong className="text-foreground">{offer.quantity.toLocaleString()} {request.unit}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Offered Unit Price: </span>
                        <strong className="text-emerald-800">GH₵{offer.price_per_unit.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Quote: </span>
                        <strong className="text-foreground font-semibold">
                          GH₵{(offer.quantity * offer.price_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                      {offer.available_date && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Available: {new Date(offer.available_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {offer.message && (
                      <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded border border-stone-100 italic">
                        &ldquo;{offer.message}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-3 md:pt-0 border-t md:border-t-0 border-border/60 flex items-center justify-end">
                    <RequestOfferActionButtons
                      requestOfferId={offer.id}
                      status={offer.status}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
