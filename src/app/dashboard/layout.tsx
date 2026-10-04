import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireProfile } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
