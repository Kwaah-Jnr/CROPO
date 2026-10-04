import type { UserRole } from "@/types/domain";

/** Icon keys are resolved to Lucide icons in the (client) nav component. */
export type NavIcon =
  | "dashboard"
  | "listings"
  | "offers"
  | "orders"
  | "earnings"
  | "profile"
  | "verification"
  | "marketplace"
  | "requests"
  | "suppliers"
  | "farmers"
  | "buyers"
  | "disputes"
  | "analytics";

export type NavItem = { href: string; label: string; icon: NavIcon; exact?: boolean };

export const publicNav: readonly { href: string; label: string }[] = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

export const dashboardNav: Record<UserRole, readonly NavItem[]> = {
  FARMER: [
    { href: "/dashboard/farmer", label: "Overview", icon: "dashboard", exact: true },
    { href: "/dashboard/farmer/listings", label: "Listings", icon: "listings" },
    { href: "/dashboard/farmer/offers", label: "Offers", icon: "offers" },
    { href: "/dashboard/farmer/orders", label: "Orders", icon: "orders" },
    { href: "/dashboard/farmer/earnings", label: "Earnings", icon: "earnings" },
    { href: "/dashboard/farmer/verification", label: "Verification", icon: "verification" },
    { href: "/dashboard/farmer/profile", label: "Profile", icon: "profile" },
  ],
  BUYER: [
    { href: "/dashboard/buyer", label: "Overview", icon: "dashboard", exact: true },
    { href: "/dashboard/buyer/marketplace", label: "Marketplace", icon: "marketplace" },
    { href: "/dashboard/buyer/requests", label: "Buying requests", icon: "requests" },
    { href: "/dashboard/buyer/offers", label: "Offers", icon: "offers" },
    { href: "/dashboard/buyer/orders", label: "Orders", icon: "orders" },
    { href: "/dashboard/buyer/suppliers", label: "Saved suppliers", icon: "suppliers" },
    { href: "/dashboard/buyer/profile", label: "Profile", icon: "profile" },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: "dashboard", exact: true },
    { href: "/dashboard/admin/farmers", label: "Farmers", icon: "farmers" },
    { href: "/dashboard/admin/buyers", label: "Buyers", icon: "buyers" },
    { href: "/dashboard/admin/listings", label: "Listings", icon: "listings" },
    { href: "/dashboard/admin/orders", label: "Orders", icon: "orders" },
    { href: "/dashboard/admin/disputes", label: "Disputes", icon: "disputes" },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: "analytics" },
  ],
};
