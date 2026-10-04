"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { createBuyingRequest } from "@/actions/buyer";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GHANA_REGIONS } from "@/config/regions";
import { PRODUCE_GRADES, PRODUCE_UNITS } from "@/lib/validation/farmer";

type CategoryOption = { id: string; name: string };

export function BuyingRequestForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createBuyingRequest, null);

  const isSuccess = state !== null && state.ok;
  const isFailure = state !== null && !state.ok;
  const formError = isFailure ? state.error : null;
  const successMessage = isSuccess ? state.message : null;
  const fieldErrors = isFailure ? state.fieldErrors : undefined;
  const values = isFailure && state.values ? state.values : {};

  useEffect(() => {
    if (isSuccess) {
      router.push("/dashboard/buyer/requests");
      router.refresh();
    }
  }, [isSuccess, router]);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <Link
            href="/dashboard/buyer/requests"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-3.5" /> Back to Buying Requests
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Post Wholesale Buying Request</h1>
          <p className="text-xs text-muted-foreground">
            Publish your procurement volume and destination. Verified farmers will submit binding wholesale quotes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/buyer/requests">Cancel</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isPending || isSuccess}>
            {isPending || isSuccess ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" /> {isSuccess ? "Redirecting..." : "Publishing..."}
              </>
            ) : (
              "Publish Request"
            )}
          </Button>
        </div>
      </div>

      {formError ? (
        <FormMessage variant="error">
          <p className="font-semibold">{formError}</p>
        </FormMessage>
      ) : null}

      {successMessage ? (
        <FormMessage variant="success">
          <p className="font-semibold">{successMessage}</p>
        </FormMessage>
      ) : null}

      {/* SECTION 1: CROP & VOLUME */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          1. Required Commodity & Volume
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Crop Name */}
          <div className="space-y-1.5">
            <Label htmlFor="crop_name">
              Crop Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="crop_name"
              name="crop_name"
              placeholder="e.g. Yellow Yam, White Maize, Red Peppers"
              defaultValue={values.crop_name || ""}
              required
            />
            <FieldError id="crop-err" messages={fieldErrors?.crop_name} />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Agricultural Category</Label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={values.category_id || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">General Commodity Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Volume */}
          <div className="space-y-1.5">
            <Label htmlFor="quantity">
              Target Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              min="0.1"
              placeholder="e.g. 500"
              defaultValue={values.quantity || ""}
              required
            />
            <FieldError id="qty-err" messages={fieldErrors?.quantity} />
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label htmlFor="unit">
              Unit of Measure <span className="text-destructive">*</span>
            </Label>
            <select
              id="unit"
              name="unit"
              defaultValue={values.unit || "BAG"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              {PRODUCE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <FieldError id="unit-err" messages={fieldErrors?.unit} />
          </div>
        </div>
      </div>

      {/* SECTION 2: QUALITY & FULFILLMENT TIMELINE */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          2. Specifications & Destination
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Desired Grade */}
          <div className="space-y-1.5">
            <Label htmlFor="desired_grade">Desired Grade</Label>
            <select
              id="desired_grade"
              name="desired_grade"
              defaultValue={values.desired_grade || "A"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Any Acceptable Quality</option>
              {PRODUCE_GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Region */}
          <div className="space-y-1.5">
            <Label htmlFor="destination_region">
              Destination Region <span className="text-destructive">*</span>
            </Label>
            <select
              id="destination_region"
              name="destination_region"
              defaultValue={values.destination_region || "Greater Accra"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r} Region
                </option>
              ))}
            </select>
          </div>

          {/* Destination City */}
          <div className="space-y-1.5">
            <Label htmlFor="destination_city">Destination Town/City</Label>
            <Input
              id="destination_city"
              name="destination_city"
              placeholder="e.g. Accra, Tema, Kumasi"
              defaultValue={values.destination_city || ""}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          {/* Required By Date */}
          <div className="space-y-1.5">
            <Label htmlFor="required_by">Required By Date</Label>
            <Input
              id="required_by"
              name="required_by"
              type="date"
              defaultValue={values.required_by || ""}
            />
          </div>

          {/* Target Price */}
          <div className="space-y-1.5">
            <Label htmlFor="target_price_per_unit">Target Unit Price (GH₵, optional)</Label>
            <Input
              id="target_price_per_unit"
              name="target_price_per_unit"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 120.00"
              defaultValue={values.target_price_per_unit || ""}
            />
            <p className="text-[11px] text-muted-foreground">Leaves room for competitive farmer bidding.</p>
          </div>
        </div>

        {/* Specifications textarea */}
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="description">Detailed Procurement Specifications</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Describe packaging preferences (e.g. 50kg sacks, crates), delivery schedule, moisture tolerance, or warehouse unloading terms..."
            defaultValue={values.description || ""}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <FieldError id="desc-err" messages={fieldErrors?.description} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/buyer/requests">Cancel</Link>
        </Button>
        <Button type="submit" size="default" disabled={isPending || isSuccess}>
          {isPending || isSuccess ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> {isSuccess ? "Redirecting..." : "Publishing..."}
            </>
          ) : (
            "Publish Buying Request"
          )}
        </Button>
      </div>
    </form>
  );
}
