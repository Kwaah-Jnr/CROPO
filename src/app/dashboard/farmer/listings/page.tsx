import Link from "next/link";
import { ExternalLink, Filter, Plus, Search, Sprout } from "lucide-react";

import { ListingStatusToggle } from "@/components/farmer/listing-status-toggle";
import { StatusBadge } from "@/components/farmer/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/session";
import { getFarmerListings } from "@/lib/data/farmer";

export const metadata = {
  title: "My Produce Listings — Farmer Dashboard | Cropo",
  description: "View, filter, and manage your agricultural produce listings on Cropo.",
};

export default async function FarmerListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const profile = await requireRole("FARMER");
  const params = await searchParams;
  const statusFilter = params.status || "ALL";
  const query = params.q || "";

  const listings = await getFarmerListings(profile.id, {
    status: statusFilter,
    query,
  });

  const statuses = [
    { label: "All Active & Drafts", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Draft", value: "DRAFT" },
    { label: "Paused", value: "PAUSED" },
    { label: "Sold Out", value: "SOLD_OUT" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <PageHeader
          title="Produce Listings"
          description="Manage your harvest batches, edit pricing and quantities, or publish new produce."
        />
        <Button asChild size="sm" className="shrink-0">
          <Link href="/dashboard/farmer/listings/new">
            <Plus className="mr-1.5 size-4" /> Add Produce
          </Link>
        </Button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {statuses.map((s) => {
            const isSelected = statusFilter === s.value;
            return (
              <Link
                key={s.value}
                href={`/dashboard/farmer/listings?status=${s.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        {/* Search Input */}
        <form method="GET" action="/dashboard/farmer/listings" className="relative w-full sm:w-64">
          <input type="hidden" name="status" value={statusFilter} />
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search crop or variety..."
            className="pl-9 h-9 text-xs"
          />
        </form>
      </div>

      {/* LISTINGS TABLE */}
      {listings.length > 0 ? (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Produce / Variety</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Available Stock</th>
                  <th className="py-3 px-4">Farm-Gate Price</th>
                  <th className="py-3 px-4">Quality Grade</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                    {/* Produce & Variety */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground text-sm">{l.crop_name}</div>
                      {l.variety ? (
                        <div className="text-muted-foreground text-[11px]">Variety: {l.variety}</div>
                      ) : null}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-muted-foreground">{l.category_name}</td>

                    {/* Available Stock */}
                    <td className="py-3 px-4 font-semibold tabular text-foreground">
                      {l.quantity_available.toLocaleString()} {l.unit}
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-4 font-semibold tabular text-foreground">
                      GH₵ {l.price_per_unit.toFixed(2)}
                      <span className="text-[10px] font-normal text-muted-foreground"> / {l.unit.toLowerCase()}</span>
                    </td>

                    {/* Quality Grade */}
                    <td className="py-3 px-4">
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        Grade {l.grade}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-muted-foreground">
                      {l.city ? `${l.city}, ` : ""}
                      {l.region}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={l.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-2">
                      <div className="flex items-center justify-end gap-2">
                        <ListingStatusToggle listingId={l.id} currentStatus={l.status} />

                        <Button asChild variant="outline" size="xs">
                          <Link href={`/dashboard/farmer/listings/${l.id}/edit`}>Edit</Link>
                        </Button>

                        {l.status === "ACTIVE" ? (
                          <Button asChild variant="ghost" size="xs" title="View Public Listing">
                            <Link href={`/marketplace/${l.id}`} target="_blank">
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Sprout className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {query || statusFilter !== "ALL" ? "No matching produce listings found" : "No produce listings yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {query || statusFilter !== "ALL"
                ? "Try clearing your search query or selecting a different status filter."
                : "Create your first produce listing with crop details, harvest dates, and photos to start selling to buyers."}
            </p>
          </div>
          <div>
            {query || statusFilter !== "ALL" ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/farmer/listings">
                  <Filter className="mr-1.5 size-3.5" /> Clear Filters
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/dashboard/farmer/listings/new">
                  <Plus className="mr-1.5 size-4" /> Add Produce Listing
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
