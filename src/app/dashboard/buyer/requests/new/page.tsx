import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getCropCategories } from "@/lib/data/farmer";
import { BuyingRequestForm } from "@/components/buyer/request-form";

export const metadata = {
  title: "New Buying Request | Cropo Buyer",
  description: "Post a new request for quotation (RFQ) to verified farmers on Cropo.",
};

export default async function NewBuyingRequestPage() {
  const profile = await requireRole("BUYER");
  if (!profile) redirect("/login");

  const categories = await getCropCategories();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/buyer/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Buying Requests
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground font-display">
          Create Buying Request (RFQ)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Broadcast your commercial produce volume, quality criteria, and delivery timelines to certified regional farmers.
        </p>
      </div>

      <BuyingRequestForm categories={categories} />
    </div>
  );
}
