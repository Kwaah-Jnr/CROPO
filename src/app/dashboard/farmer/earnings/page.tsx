import Link from "next/link";
import { CheckCircle2, ShieldCheck, Wallet } from "lucide-react";

import { MetricCard } from "@/components/farmer/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getFarmerEarnings } from "@/lib/data/farmer";

export const metadata = {
  title: "Earnings & Settlements — Farmer Dashboard | Cropo",
  description: "Overview of realized produce sales and completed trade settlements.",
};

export default async function FarmerEarningsPage() {
  const profile = await requireRole("FARMER");
  const data = await getFarmerEarnings(profile.id);

  return (
    <div className="space-y-8">
      <div className="border-b pb-4">
        <PageHeader
          title="Earnings & Sales Summary"
          description="Transparent accounting of completed produce orders and in-progress harvest fulfillment."
        />
      </div>

      {/* METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Realized Revenue"
          value={`GH₵ ${data.totalCompletedEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle={`${data.completedCount} completed trade settlements`}
          icon={Wallet}
        />
        <MetricCard
          title="In-Fulfillment Value"
          value={`GH₵ ${data.totalPendingFulfillment.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle={`${data.inFulfillmentCount} orders currently in progress`}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Total Completed Orders"
          value={data.completedCount}
          subtitle="Successfully delivered & verified"
          icon={ShieldCheck}
        />
      </div>

      {/* SETTLEMENT NOTICE */}
      <div className="rounded-xl border bg-card p-5 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Fulfillment Settlement & Payment Release Policy</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Cropo protects agricultural trades through standardized delivery inspection. When produce arrives at the buyer destination and weights and quality grades are confirmed satisfactory, the order status advances to <code className="font-mono text-foreground font-semibold">COMPLETED</code>, realizing the transaction value in your account summary.
        </p>
      </div>

      {/* COMPLETED TRANSACTIONS TABLE */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground">Completed Order Settlements</h2>

        {data.completedOrders.length > 0 ? (
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Commercial Buyer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Settled Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.completedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">{o.order_number}</td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-foreground font-medium">{o.buyer_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {o.items.map((i) => `${i.crop_name} (${i.quantity} ${i.unit})`).join(", ")}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular text-foreground">
                      GH₵ {o.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center space-y-3">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wallet className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No Completed Sales Yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Completed transactions and settled order earnings will be logged here once your first harvest orders are delivered and accepted.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/farmer/listings">Manage Produce Listings</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
