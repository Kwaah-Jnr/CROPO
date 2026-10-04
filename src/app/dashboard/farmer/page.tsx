import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/session";

export default async function FarmerDashboardPage() {
  const profile = await requireRole("FARMER");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile.full_name}`}
        description="Manage your harvest listings, view buyer offers, and track your agricultural orders."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Produce Listings</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Active listings ready for buyers</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Incoming Offers</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Pending review from buyers</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Orders</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Orders awaiting fulfillment</p>
        </div>
      </div>
    </div>
  );
}
