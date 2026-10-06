"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GHANA_REGIONS } from "@/config/regions";

const CATEGORIES = [
  { slug: "all", name: "All Categories" },
  { slug: "vegetables", name: "Vegetables" },
  { slug: "fruits", name: "Fruits" },
  { slug: "roots-tubers", name: "Roots & Tubers" },
  { slug: "plantain-banana", name: "Plantain & Banana" },
  { slug: "grains-cereals", name: "Grains & Cereals" },
  { slug: "legumes-nuts", name: "Legumes & Nuts" },
  { slug: "spices-herbs", name: "Spices & Herbs" },
];

export function MarketplaceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") || "";
  const currentCategory = searchParams.get("category") || "all";
  const currentRegion = searchParams.get("region") || "all";
  const currentGrade = searchParams.get("grade") || "all";
  const currentDelivery = searchParams.get("delivery") === "true";
  const currentMinQuantity = searchParams.get("minQuantity") || "";
  const currentVerified = searchParams.get("verified") === "true";

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasActiveFilters =
    currentQ ||
    currentCategory !== "all" ||
    currentRegion !== "all" ||
    currentGrade !== "all" ||
    currentDelivery ||
    currentMinQuantity ||
    currentVerified;

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Filter Marketplace</h2>
        </div>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Reset
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
        {/* Search */}
        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="search-crop" className="text-xs font-medium text-muted-foreground">
            Search Crop or Variety
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="search-crop"
              type="search"
              placeholder="e.g. Tomatoes, Pona Yam, Maize..."
              defaultValue={currentQ}
              onChange={(e) => updateQuery({ q: e.target.value || null })}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label htmlFor="filter-category" className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            id="filter-category"
            value={currentCategory}
            onChange={(e) => updateQuery({ category: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div className="space-y-1.5">
          <label htmlFor="filter-region" className="text-xs font-medium text-muted-foreground">
            Region of Origin
          </label>
          <select
            id="filter-region"
            value={currentRegion}
            onChange={(e) => updateQuery({ region: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="all">All Regions (Ghana)</option>
            {GHANA_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Grade */}
        <div className="space-y-1.5">
          <label htmlFor="filter-grade" className="text-xs font-medium text-muted-foreground">
            Quality Grade
          </label>
          <select
            id="filter-grade"
            value={currentGrade}
            onChange={(e) => updateQuery({ grade: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="all">All Grades</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
        </div>

        {/* Minimum Quantity */}
        <div className="space-y-1.5">
          <label htmlFor="filter-min-quantity" className="text-xs font-medium text-muted-foreground">
            Min. Quantity
          </label>
          <Input
            id="filter-min-quantity"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 50"
            defaultValue={currentMinQuantity}
            onChange={(e) => updateQuery({ minQuantity: e.target.value || null })}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Toggle row: Delivery + Verified */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={currentDelivery}
            onChange={(e) => updateQuery({ delivery: e.target.checked ? "true" : null })}
            className="size-4 rounded border-input text-primary focus:ring-ring"
          />
          Delivery Available
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer select-none">
          <input
            id="filter-verified"
            type="checkbox"
            checked={currentVerified}
            onChange={(e) => updateQuery({ verified: e.target.checked ? "true" : null })}
            className="size-4 rounded border-input text-primary focus:ring-ring"
          />
          Verified Farmers Only
        </label>
      </div>
    </div>
  );
}
