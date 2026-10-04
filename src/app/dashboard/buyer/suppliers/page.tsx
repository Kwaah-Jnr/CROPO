import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ShieldCheck, MapPin, ArrowUpRight } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getBuyerSavedSuppliers } from "@/lib/data/buyer";
import { Button } from "@/components/ui/button";
import { SaveSupplierButton } from "@/components/buyer/save-supplier-button";

export const metadata = {
  title: "Saved Suppliers | Cropo Buyer",
  description: "Directory of preferred agricultural producers and verified suppliers.",
};

export default async function BuyerSuppliersPage() {
  const profile = await requireRole("BUYER");
  if (!profile) redirect("/login");

  const suppliers = await getBuyerSavedSuppliers(profile.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Saved Suppliers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Maintain your preferred network of verified regional producers for recurring procurement.
          </p>
        </div>
        <Link href="/dashboard/buyer/marketplace">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
            Explore Producers
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/50">
          <Users className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No saved suppliers yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            You haven&apos;t bookmarked any suppliers. As you browse produce in the marketplace, bookmark verified farmers to build your supplier network.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/buyer/marketplace">
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                Discover Verified Farmers
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.farmer_id}
              className="rounded-xl border border-border/80 bg-card p-5 hover:border-emerald-600/30 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base text-foreground font-display">
                        {s.full_name}
                      </span>
                      {s.verification_status === "VERIFIED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    {s.region && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {s.region}{s.city ? `, ${s.city}` : ""}
                      </span>
                    )}
                  </div>

                  <SaveSupplierButton farmerId={s.farmer_id} initialSaved={true} />
                </div>

                {s.bio && (
                  <p className="text-xs text-stone-600 line-clamp-2">
                    {s.bio}
                  </p>
                )}

                {s.farms.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Farms: </span>
                    {s.farms.map((farm: { name: string; region: string }) => farm.name).join(", ")}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{s.active_listings_count}</strong> active {s.active_listings_count === 1 ? "listing" : "listings"}
                </span>

                <Link
                  href={`/dashboard/buyer/marketplace?query=${encodeURIComponent(s.full_name)}`}
                  className="font-medium text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
                >
                  View Produce
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
