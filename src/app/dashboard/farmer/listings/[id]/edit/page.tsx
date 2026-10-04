import { notFound } from "next/navigation";

import { updateListing } from "@/actions/farmer";
import { ListingForm } from "@/components/farmer/listing-form";
import { requireRole } from "@/lib/auth/session";
import {
  getCropCategories,
  getFarmerFarms,
  getFarmerListingById,
} from "@/lib/data/farmer";

export const metadata = {
  title: "Edit Produce Listing — Farmer Dashboard | Cropo",
  description: "Update produce batch specifications, quantities, and pricing.",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole("FARMER");
  const { id } = await params;

  const listing = await getFarmerListingById(id, profile.id);
  if (!listing) {
    notFound();
  }

  const categories = await getCropCategories();
  const farms = await getFarmerFarms(profile.id);

  const boundUpdateAction = updateListing.bind(null, id);

  return (
    <div className="space-y-6">
      <ListingForm
        action={boundUpdateAction}
        categories={categories}
        farms={farms}
        initialData={listing}
        existingImages={listing.images}
        isEditing={true}
      />
    </div>
  );
}
