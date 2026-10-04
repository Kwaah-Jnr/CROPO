import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Inbox, Tag, ArrowUpRight, Clock, MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getBuyerOffers } from "@/lib/data/buyer";
import { Button } from "@/components/ui/button";
import { OfferWithdrawButton } from "@/components/buyer/offer-withdraw-button";

export const metadata = {
  title: "My Offers | Cropo Buyer",
  description: "Track price offers and negotiations submitted to farmers.",
};

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Withdrawn", value: "WITHDRAWN" },
];

export default async function BuyerOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRole("BUYER");
  if (!profile) redirect("/login");

  const { status = "ALL" } = await searchParams;
  const offers = await getBuyerOffers(profile.id, status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            My Offers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track price proposals submitted for marketplace listings and review farmer responses.
          </p>
        </div>
        <Link href="/dashboard/buyer/marketplace">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
            Browse Marketplace
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 overflow-x-auto pb-px">
        {TABS.map((tab) => {
          const isActive = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/dashboard/buyer/offers${tab.value === "ALL" ? "" : `?status=${tab.value}`}`}
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

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/50">
          <Inbox className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No offers found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {status === "ALL"
              ? "You haven't submitted any custom price offers yet. Browse produce in the marketplace and submit an offer to negotiate."
              : `You have no offers with status "${status}".`}
          </p>
          <div className="mt-6">
            <Link href="/dashboard/buyer/marketplace">
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                Explore Marketplace Produce
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const totalValue = offer.quantity * offer.price_per_unit;
            const originalTotal = offer.quantity * offer.listing.listing_price;
            const diffPct =
              originalTotal > 0
                ? Math.round(((totalValue - originalTotal) / originalTotal) * 100)
                : 0;

            return (
              <div
                key={offer.id}
                className="rounded-xl border border-border/80 bg-card p-5 hover:border-emerald-600/30 transition-all shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {offer.listing.image_url ? (
                        <Image
                          src={offer.listing.image_url}
                          alt={offer.listing.crop_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Tag className="h-6 w-6 text-stone-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/marketplace/${offer.listing_id}`}
                          className="font-semibold text-base text-foreground font-display hover:text-emerald-800 transition-colors"
                        >
                          {offer.listing.crop_name}
                        </Link>
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                          Grade {offer.listing.grade}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            offer.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : offer.status === "ACCEPTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : offer.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-stone-100 text-stone-600 border border-stone-200"
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>Farmer: <strong className="text-foreground">{offer.farmer.name}</strong></span>
                        {offer.listing.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {offer.listing.region}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Submitted {new Date(offer.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {offer.message && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-100 italic mt-1 max-w-xl">
                          &ldquo;{offer.message}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financials & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        Offered: <strong className="text-foreground">{offer.quantity.toLocaleString()} {offer.listing.unit}</strong> @ GH₵{offer.price_per_unit.toFixed(2)}
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        GH₵{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Listing price: GH₵{offer.listing.listing_price.toFixed(2)}/unit ({diffPct >= 0 ? `+${diffPct}` : diffPct}%)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {offer.status === "PENDING" && (
                        <OfferWithdrawButton offerId={offer.id} />
                      )}
                      <Link href={`/marketplace/${offer.listing_id}`}>
                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                          View Listing
                        </Button>
                      </Link>
                    </div>
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
