"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { deleteListingImage } from "@/actions/farmer";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GHANA_REGIONS } from "@/config/regions";
import type { ActionResult } from "@/lib/utils/action-result";
import {
  LISTING_STATUSES,
  PRODUCE_GRADES,
  PRODUCE_UNITS,
} from "@/lib/validation/farmer";

type CategoryOption = { id: string; name: string; slug: string };
type FarmOption = { id: string; name: string; region: string };
type ExistingImage = { id: string; storage_path: string; sort_order: number };

type ListingFormProps = {
  action: (_prev: unknown, formData: FormData) => Promise<ActionResult>;
  categories: CategoryOption[];
  farms: FarmOption[];
  initialData?: {
    id?: string;
    crop_name?: string;
    variety?: string | null;
    category_id?: string;
    farm_id?: string | null;
    quantity_available?: number;
    unit?: string;
    price_per_unit?: number;
    grade?: string;
    harvest_date?: string | null;
    available_date?: string | null;
    region?: string;
    city?: string | null;
    description?: string | null;
    delivery_available?: boolean;
    status?: string;
    version?: number;
  };
  existingImages?: ExistingImage[];
  isEditing?: boolean;
};

export function ListingForm({
  action,
  categories,
  farms,
  initialData,
  existingImages = [],
  isEditing = false,
}: ListingFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, null);
  const [images, setImages] = useState<ExistingImage[]>(existingImages);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const isFailure = state !== null && !state.ok;
  const isSuccess = state !== null && state.ok;
  const formError = isFailure ? state.error : null;
  const successMessage = isSuccess ? state.message : null;
  const fieldErrors = isFailure ? state.fieldErrors : undefined;
  const values = (isFailure && state.values) || initialData || {};

  useEffect(() => {
    if (isSuccess) {
      router.push("/dashboard/farmer/listings");
      router.refresh();
    }
  }, [isSuccess, router]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setImagePreviews([]);
      return;
    }

    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
  }

  async function handleDeleteExistingImage(imageId: string) {
    if (!initialData?.id) return;
    if (!confirm("Are you sure you want to remove this photo?")) return;

    setDeletingImageId(imageId);
    const res = await deleteListingImage(imageId, initialData.id);
    setDeletingImageId(null);

    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  return (
    <form action={formAction} className="space-y-8 max-w-4xl">
      {isEditing && (
        <input
          type="hidden"
          name="expected_version"
          value={initialData?.version ?? 1}
        />
      )}
      {/* Top back navigation and header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <Link
            href="/dashboard/farmer/listings"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-3.5" /> Back to My Listings
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEditing ? "Edit Produce Listing" : "List New Produce"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEditing
              ? "Update batch pricing, quantity, delivery conditions, or publish status."
              : "Specify crop details, quantity, farm-gate price, and photos to reach buyers across Ghana."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/farmer/listings">Cancel</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isPending || isSuccess}>
            {isPending || isSuccess ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> {isSuccess ? "Redirecting..." : "Saving..."}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Publish Produce Listing"
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

      {/* SECTION 1: CROP IDENTITY */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-semibold text-foreground">1. Crop Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Crop Name */}
          <div className="space-y-1.5">
            <Label htmlFor="crop_name">
              Crop Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="crop_name"
              name="crop_name"
              placeholder="e.g. Fresh Red Tomatoes, Yellow Yam, White Maize"
              defaultValue={values.crop_name || ""}
              required
            />
            <FieldError id="crop_name-error" messages={fieldErrors?.crop_name} />
          </div>

          {/* Variety */}
          <div className="space-y-1.5">
            <Label htmlFor="variety">Variety / Cultivar (optional)</Label>
            <Input
              id="variety"
              name="variety"
              placeholder="e.g. Pectomech, Pona, Red Creole, Abontem"
              defaultValue={values.variety || ""}
            />
            <FieldError id="variety-error" messages={fieldErrors?.variety} />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category_id">
              Category <span className="text-destructive">*</span>
            </Label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={values.category_id || ""}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Select agricultural category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <FieldError id="category_id-error" messages={fieldErrors?.category_id} />
          </div>

          {/* Farm Holding (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="farm_id">Origin Farm (optional)</Label>
            <select
              id="farm_id"
              name="farm_id"
              defaultValue={values.farm_id || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">No specific farm attached</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.region})
                </option>
              ))}
            </select>
            <FieldError id="farm_id-error" messages={fieldErrors?.farm_id} />
          </div>
        </div>
      </div>

      {/* SECTION 2: VOLUME & COMMERCIAL PRICING */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-semibold text-foreground">2. Volume, Measurement & Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="quantity_available">
              Available Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity_available"
              name="quantity_available"
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 500"
              defaultValue={values.quantity_available !== undefined ? String(values.quantity_available) : ""}
              required
            />
            <FieldError id="quantity_available-error" messages={fieldErrors?.quantity_available} />
          </div>

          {/* Unit of Measure */}
          <div className="space-y-1.5">
            <Label htmlFor="unit">
              Standard Unit <span className="text-destructive">*</span>
            </Label>
            <select
              id="unit"
              name="unit"
              defaultValue={values.unit || "KG"}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PRODUCE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <FieldError id="unit-error" messages={fieldErrors?.unit} />
          </div>

          {/* Price per Unit */}
          <div className="space-y-1.5">
            <Label htmlFor="price_per_unit">
              Farm-Gate Price (GH₵ per unit) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="price_per_unit"
              name="price_per_unit"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 15.00"
              defaultValue={values.price_per_unit !== undefined ? String(values.price_per_unit) : ""}
              required
            />
            <FieldError id="price_per_unit-error" messages={fieldErrors?.price_per_unit} />
          </div>
        </div>
      </div>

      {/* SECTION 3: QUALITY & HARVEST DATES */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-semibold text-foreground">3. Quality Grade & Availability Schedule</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Quality Grade */}
          <div className="space-y-1.5">
            <Label htmlFor="grade">
              Quality Grade <span className="text-destructive">*</span>
            </Label>
            <select
              id="grade"
              name="grade"
              defaultValue={values.grade || "A"}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PRODUCE_GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">Grade A = Premium; Grade B = Standard; Grade C = Processing</p>
            <FieldError id="grade-error" messages={fieldErrors?.grade} />
          </div>

          {/* Harvest Date */}
          <div className="space-y-1.5">
            <Label htmlFor="harvest_date">Harvest Date</Label>
            <Input
              id="harvest_date"
              name="harvest_date"
              type="date"
              defaultValue={values.harvest_date || ""}
            />
            <FieldError id="harvest_date-error" messages={fieldErrors?.harvest_date} />
          </div>

          {/* Available Date */}
          <div className="space-y-1.5">
            <Label htmlFor="available_date">Ready for Fulfillment Date</Label>
            <Input
              id="available_date"
              name="available_date"
              type="date"
              defaultValue={values.available_date || ""}
            />
            <FieldError id="available_date-error" messages={fieldErrors?.available_date} />
          </div>
        </div>
      </div>

      {/* SECTION 4: LOCATION & FULFILLMENT */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-semibold text-foreground">4. Origin Location & Delivery Terms</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Region */}
          <div className="space-y-1.5">
            <Label htmlFor="region">
              Region of Origin <span className="text-destructive">*</span>
            </Label>
            <select
              id="region"
              name="region"
              defaultValue={values.region || "Ashanti"}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r} Region
                </option>
              ))}
            </select>
            <FieldError id="region-error" messages={fieldErrors?.region} />
          </div>

          {/* City / District */}
          <div className="space-y-1.5">
            <Label htmlFor="city">City / District / Town</Label>
            <Input
              id="city"
              name="city"
              placeholder="e.g. Akomadan, Techiman, Ejura"
              defaultValue={values.city || ""}
            />
            <FieldError id="city-error" messages={fieldErrors?.city} />
          </div>
        </div>

        {/* Delivery Available Checkbox */}
        <div className="flex items-center gap-2 pt-2">
          <input
            id="delivery_available"
            name="delivery_available"
            type="checkbox"
            value="true"
            defaultChecked={Boolean(values.delivery_available)}
            className="size-4 rounded border-input text-primary focus:ring-primary"
          />
          <Label htmlFor="delivery_available" className="font-medium cursor-pointer">
            Delivery to buyer&apos;s location is available (or farm gate collection can be arranged)
          </Label>
        </div>
      </div>

      {/* SECTION 5: DESCRIPTION & SPECIFICATIONS */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-semibold text-foreground">5. Harvest Details & Description</h2>
        <div className="space-y-1.5">
          <Label htmlFor="description">Detailed Harvest Specifications</Label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Describe harvest maturity, packaging (e.g. 50kg jute bags, standard ventilated crates), sorting method, moisture level, or special logistics instructions..."
            defaultValue={values.description || ""}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <FieldError id="description-error" messages={fieldErrors?.description} />
        </div>
      </div>

      {/* SECTION 6: PHOTOS & SUPABASE STORAGE */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-foreground">6. Harvest Photography</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload authentic photos of the harvested produce. Maximum 5MB per image (JPEG, PNG, or WebP).
          </p>
        </div>

        {/* Existing photos (when editing) */}
        {images.length > 0 ? (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">Current Listing Photos</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-lg border overflow-hidden bg-muted group">
                  <Image
                    src={`${supabaseUrl}/storage/v1/object/public/listing-images/${img.storage_path}`}
                    alt="Produce image"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingImage(img.id)}
                    disabled={deletingImageId === img.id}
                    className="absolute top-2 right-2 rounded-full bg-destructive/90 text-destructive-foreground p-1.5 shadow-xs opacity-90 hover:opacity-100 transition-opacity"
                    title="Delete image"
                  >
                    {deletingImageId === img.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Upload input */}
        <div className="space-y-2">
          <Label htmlFor="photos" className="inline-flex items-center gap-1.5">
            <ImagePlus className="size-4 text-primary" />
            <span>{isEditing ? "Add More Photos" : "Upload Produce Photos"}</span>
          </Label>
          <Input
            id="photos"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          <p className="text-[11px] text-muted-foreground">
            Strictly real photos only. Do not upload AI-generated people or crops.
          </p>

          {/* New image previews */}
          {imagePreviews.length > 0 ? (
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground">New Photos to Upload:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1.5">
                {imagePreviews.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md border overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Upload preview ${idx + 1}`} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* SECTION 7: LISTING STATUS */}
      <div className="rounded-xl border bg-card p-6 space-y-3 shadow-xs">
        <h2 className="text-base font-semibold text-foreground">7. Listing Publication Status</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="status">Initial Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={values.status || "ACTIVE"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {LISTING_STATUSES.filter((s) => s !== "REMOVED").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <FieldError id="status-error" messages={fieldErrors?.status} />
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <span>
              <strong>ACTIVE:</strong> Visible to commercial buyers on the public marketplace immediately.
              <br />
              <strong>DRAFT:</strong> Saved in your dashboard only; not publicly listed.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/farmer/listings">Cancel</Link>
        </Button>
        <Button type="submit" size="default" disabled={isPending || isSuccess}>
          {isPending || isSuccess ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> {isSuccess ? "Redirecting..." : "Saving..."}
            </>
          ) : isEditing ? (
            "Save Changes"
          ) : (
            "Publish Produce Listing"
          )}
        </Button>
      </div>
    </form>
  );
}
