import { FarmerProfileForms } from "@/components/farmer/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/session";
import { getFarmerProfile } from "@/lib/data/farmer";

export const metadata = {
  title: "Farmer Profile & Farm Holdings — Cropo",
  description: "Manage your farmer identity, agricultural experience, and registered farm acreage.",
};

export default async function FarmerProfilePage() {
  const profile = await requireRole("FARMER");
  const data = await getFarmerProfile(profile.id);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <PageHeader
          title="Farmer Profile & Farm Holdings"
          description="Maintain your professional background, contact details, and registered farmland."
        />
      </div>

      <FarmerProfileForms
        profile={data.profile}
        farmerProfile={data.farmerProfile}
        farms={data.farms}
      />
    </div>
  );
}
