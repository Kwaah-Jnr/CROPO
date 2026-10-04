import { redirect } from "next/navigation";

import { dashboardPathForRole } from "@/lib/auth/roles";
import { requireProfile } from "@/lib/auth/session";

export default async function DashboardRootPage() {
  const profile = await requireProfile();
  redirect(dashboardPathForRole(profile.role));
}
