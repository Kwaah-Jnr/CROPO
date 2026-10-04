import type { UserRole } from "@/types/domain";

export const USER_ROLES = ["FARMER", "BUYER", "ADMIN"] as const satisfies readonly UserRole[];

/** Roles a user may choose at signup. ADMIN is never self-assignable. */
export const SIGNUP_ROLES = ["FARMER", "BUYER"] as const satisfies readonly UserRole[];

const DASHBOARD_PATHS: Record<UserRole, string> = {
  FARMER: "/dashboard/farmer",
  BUYER: "/dashboard/buyer",
  ADMIN: "/dashboard/admin",
};

export function dashboardPathForRole(role: UserRole): string {
  return DASHBOARD_PATHS[role];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  FARMER: "Farmer",
  BUYER: "Buyer",
  ADMIN: "Administrator",
};
