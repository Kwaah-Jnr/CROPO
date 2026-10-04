import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const profile = await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace Administration"
        description={`Administrator portal — signed in as ${profile.full_name}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Verifications</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Farmer and farm verification queue</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Listings</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Live across marketplace</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Disputes</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">Requiring mediation</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Orders</p>
          <p className="mt-2 text-2xl font-bold tabular">0</p>
          <p className="mt-1 text-xs text-muted-foreground">System-wide marketplace orders</p>
        </div>
      </div>
    </div>
  );
}
