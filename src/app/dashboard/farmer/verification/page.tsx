import Link from "next/link";
import {
  CheckCircle2,
  FileCheck2,
  Lock,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { StatusBadge } from "@/components/farmer/status-badge";
import { VerificationForm } from "@/components/farmer/verification-form";
import { VerificationHistory } from "@/components/farmer/verification-history";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getFarmerProfile, getFarmerVerificationSubmissions } from "@/lib/data/farmer";

export const metadata = {
  title: "Verification Status — Farmer Dashboard | Cropo",
  description: "Understand your Cropo verification standing and submit verification credentials.",
};

export default async function FarmerVerificationPage() {
  const profile = await requireRole("FARMER");
  const data = await getFarmerProfile(profile.id);
  const submissions = await getFarmerVerificationSubmissions(profile.id);

  const status = data.farmerProfile?.verification_status || "UNVERIFIED";
  const isFarmerVerified = status === "VERIFIED";
  const hasPendingIdentitySubmission = submissions.some(
    (s) => s.type === "FARMER_IDENTITY" && s.status === "PENDING"
  );

  const farmOptions = data.farms.map((f) => ({
    id: f.id,
    name: f.name,
    region: f.region,
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b pb-4">
        <PageHeader
          title="Farmer Verification Standing"
          description="Cropo operates on audited verification rather than artificial claims. Review and manage your trust credentials."
        />
      </div>

      {/* CURRENT STATUS CARD */}
      <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Current Standing:</h2>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status === "VERIFIED"
                  ? "Your identity and farm credentials are fully authenticated by Cropo administrators."
                  : status === "PENDING"
                  ? "Your documentation is under review by our agricultural operations team."
                  : status === "REJECTED"
                  ? "Your previous verification submission requires revision. Please review administrator feedback below and resubmit."
                  : "Upload your Ghana Card or land documentation below to submit for verified standing."}
              </p>
            </div>
          </div>

          <Button asChild size="sm" variant={status === "VERIFIED" ? "outline" : "default"}>
            <Link href="/dashboard/farmer/profile">
              {status === "VERIFIED" ? "View Farm Profile" : "Manage Farm Holdings"}
            </Link>
          </Button>
        </div>
      </div>

      {/* VERIFICATION SUBMISSIONS AUDIT HISTORY */}
      <VerificationHistory submissions={submissions} />

      {/* VERIFICATION SUBMISSION FORM */}
      <VerificationForm
        farms={farmOptions}
        hasPendingIdentitySubmission={hasPendingIdentitySubmission}
        isFarmerVerified={isFarmerVerified}
      />

      {/* HOW VERIFICATION WORKS */}
      <div className="rounded-xl border bg-card p-6 space-y-6 shadow-xs">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">How Verification Works on Cropo</h3>
          <p className="text-xs text-muted-foreground">
            We never generate automated badges. Verification requires physical or documentation review by authorized administrators.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <FileCheck2 className="size-4 text-primary" />
              <span>1. Identity Review</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Ghana Card / National ID verification confirms the primary farmer identity and community contact standing.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Scale className="size-4 text-primary" />
              <span>2. Farm Land Audit</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              District location, acreage, and operational cultivation capacity validated through physical or cooperative audits.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              <span>3. Marketplace Badge</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              The Verified Farmer badge is permanently displayed on your produce listings and public profile.
            </p>
          </div>
        </div>
      </div>

      {/* PRIVACY & DATA PROTECTION NOTICE */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Lock className="size-4 text-primary" />
          <span>Strict Privacy & Document Safeguard</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          National identity numbers, land documents, and personal contact telephone numbers are strictly encrypted and stored in private Supabase Storage buckets. They are accessible only by authorized administrators for verification purposes and are <strong>never</strong> exposed on the public marketplace or shared with unauthorized third parties.
        </p>
      </div>
    </div>
  );
}
