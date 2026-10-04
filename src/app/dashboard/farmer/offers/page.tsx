import Link from "next/link";
import { Clock, ExternalLink, MessageSquare, Tag } from "lucide-react";

import { StatusBadge } from "@/components/farmer/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getFarmerOffers } from "@/lib/data/farmer";

export const metadata = {
  title: "Incoming Offers — Farmer Dashboard | Cropo",
  description: "Review purchase offers received from commercial buyers on your produce.",
};

export default async function FarmerOffersPage() {
  const profile = await requireRole("FARMER");
  const offers = await getFarmerOffers(profile.id);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <PageHeader
          title="Incoming Purchase Offers"
          description="Review custom quantity and unit price proposals received from verified buyers."
        />
      </div>

      {offers.length > 0 ? (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-xl border bg-card p-5 space-y-4 shadow-xs hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                    {offer.buyer_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{offer.buyer_name}</h3>
                      <span className="text-[11px] text-muted-foreground">({offer.buyer_business_type})</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Buyer Location: {offer.buyer_location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <StatusBadge status={offer.status} />
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(offer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Offer terms */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Produce Listing</span>
                  <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                    {offer.crop_name}
                    <Link
                      href={`/marketplace/${offer.listing_id}`}
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                    </Link>
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Offered Quantity</span>
                  <p className="font-semibold text-foreground mt-0.5 tabular">
                    {offer.quantity.toLocaleString()} {offer.unit}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Offered Unit Price</span>
                  <p className="font-semibold text-foreground mt-0.5 tabular">
                    GH₵ {offer.price_per_unit.toFixed(2)}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {" "}
                      (List: GH₵ {offer.listing_unit_price.toFixed(2)})
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Total Batch Offer</span>
                  <p className="font-bold text-foreground text-sm mt-0.5 tabular">
                    GH₵ {offer.total_offer_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Buyer Note / Negotiation Message */}
              {offer.message ? (
                <div className="rounded-lg bg-muted/40 p-3 text-xs flex items-start gap-2 text-muted-foreground">
                  <MessageSquare className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground">Buyer Message: </span>
                    <span>{offer.message}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Tag className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No purchase offers received yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              When commercial buyers propose custom wholesale volumes or target prices on your active listings, their offers will appear here for your review.
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
