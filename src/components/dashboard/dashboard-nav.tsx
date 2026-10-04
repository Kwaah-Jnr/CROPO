"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  Building2,
  FileText,
  Globe,
  LayoutDashboard,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { dashboardNav, type NavIcon } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

const ICON_MAP: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  listings: Store,
  offers: Tag,
  orders: ShoppingBag,
  earnings: Wallet,
  profile: User,
  verification: ShieldCheck,
  marketplace: Globe,
  requests: FileText,
  suppliers: Bookmark,
  farmers: Users,
  buyers: Building2,
  disputes: AlertTriangle,
  analytics: BarChart3,
};

export function DashboardNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const navItems = dashboardNav[role] || [];

  return (
    <nav className="flex flex-col gap-1 py-2">
      {navItems.map((item) => {
        const Icon = ICON_MAP[item.icon] || LayoutDashboard;
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
