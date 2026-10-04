import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/session";

export default async function BuyerDashboardPage() {
  const profile = await requireRole("BUYER");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile.full_name}`}
        description="Source fresh produce directly from verified farmers, manage buying requests, and track your orders."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Orders</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Orders currently in progress</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Buying Requests</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Open requests awaiting farmer offers</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saved Suppliers</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Trusted farmers saved for sourcing</p>
        </div>
      </div>
    </div>
  );
}
