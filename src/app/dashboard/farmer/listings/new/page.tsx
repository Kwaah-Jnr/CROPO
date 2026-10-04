import { createListing } from "@/actions/farmer";
import { ListingForm } from "@/components/farmer/listing-form";
import { requireRole } from "@/lib/auth/session";
import { getCropCategories, getFarmerFarms } from "@/lib/data/farmer";

export const metadata = {
  title: "List New Produce — Farmer Dashboard | Cropo",
  description: "Create and publish a new harvest batch listing on Cropo.",
};

export default async function NewListingPage() {
  const profile = await requireRole("FARMER");
  const categories = await getCropCategories();
  const farms = await getFarmerFarms(profile.id);

  return (
    <div className="space-y-6">
      <ListingForm
        action={createListing}
        categories={categories}
        farms={farms}
        isEditing={false}
      />
    </div>
  );
}
