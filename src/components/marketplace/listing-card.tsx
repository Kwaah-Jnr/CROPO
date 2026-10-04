import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MapPin, Truck } from "lucide-react";

import type { MarketplaceListing } from "@/lib/data/marketplace";

export function ListingCard({ listing }: { listing: MarketplaceListing }) {
  const primaryImage = listing.images[0] || "/images/placeholder-crop.jpg";

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/50 hover:shadow-sm"
    >
      {/* Produce Image */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        <Image
          src={primaryImage}
          alt={listing.crop_name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <span className="rounded bg-background/90 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs text-foreground shadow-xs">
            Grade {listing.grade}
          </span>
          {listing.delivery_available ? (
            <span className="inline-flex items-center gap-1 rounded bg-primary/90 px-2 py-0.5 text-xs font-medium text-primary-foreground backdrop-blur-xs shadow-xs">
              <Truck className="size-3" aria-hidden="true" /> Delivery
            </span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category & Location */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-primary">{listing.category_name}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {listing.city}, {listing.region}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-1.5 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
          {listing.crop_name}
          {listing.variety ? (
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              ({listing.variety})
            </span>
          ) : null}
        </h3>

        {/* Price & Quantity Grid */}
        <div className="mt-4 flex items-end justify-between border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-lg font-bold text-foreground tabular">
              GH₵ {listing.price_per_unit.toFixed(2)}
              <span className="text-xs font-normal text-muted-foreground"> / {listing.unit.toLowerCase()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-sm font-semibold text-foreground tabular">
              {listing.quantity_available.toLocaleString()} {listing.unit}
            </p>
          </div>
        </div>

        {/* Farmer Trust Indicator */}
        <div className="mt-3 flex items-center justify-between border-t border-dashed pt-2.5 text-xs text-muted-foreground">
          <span className="truncate">{listing.farmer.full_name}</span>
          {listing.farmer.verification_status === "VERIFIED" ? (
            <span className="inline-flex items-center gap-1 text-primary font-medium">
              <CheckCircle2 className="size-3" aria-hidden="true" /> Verified
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
