import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getBuyerProfileData } from "@/lib/data/buyer";
import { BuyerProfileForm } from "@/components/buyer/profile-form";

export const metadata = {
  title: "Commercial Buyer Profile | Cropo",
  description: "Manage commercial buyer profile, trading credentials, and delivery addresses.",
};

export default async function BuyerProfilePage() {
  const userProfile = await requireRole("BUYER");
  if (!userProfile) redirect("/login");

  const { profile, buyerProfile } = await getBuyerProfileData(userProfile.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Commercial Buyer Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization details, contact representative, and default delivery regions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            Commercial Buyer
          </span>
          {buyerProfile?.verification_status && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 uppercase tracking-wider">
              {buyerProfile.verification_status}
            </span>
          )}
        </div>
      </div>

      <BuyerProfileForm
        initialProfile={{
          full_name: profile?.full_name || "",
          phone: profile?.phone || null,
          region: profile?.region || null,
          city: profile?.city || null,
        }}
        initialBuyerProfile={
          buyerProfile
            ? {
                business_name: buyerProfile.business_name,
                business_type: buyerProfile.business_type,
                verification_status: buyerProfile.verification_status,
              }
            : null
        }
      />
    </div>
  );
}
