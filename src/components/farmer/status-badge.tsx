import { cn } from "@/lib/utils";

type StatusType =
  // Listing
  | "ACTIVE"
  | "DRAFT"
  | "PAUSED"
  | "SOLD_OUT"
  | "REMOVED"
  // Order
  | "PENDING"
  | "ACCEPTED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED"
  | "REJECTED"
  // Offer
  | "WITHDRAWN"
  | "EXPIRED"
  // Verification
  | "VERIFIED"
  | "UNVERIFIED";

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; bg: string; text: string; dot: string }
> = {
  ACTIVE: { label: "Active", bg: "bg-emerald-500/10", text: "text-emerald-700", dot: "bg-emerald-600" },
  DRAFT: { label: "Draft", bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  PAUSED: { label: "Paused", bg: "bg-amber-500/10", text: "text-amber-700", dot: "bg-amber-600" },
  SOLD_OUT: { label: "Sold Out", bg: "bg-stone-500/10", text: "text-stone-700", dot: "bg-stone-600" },
  REMOVED: { label: "Removed", bg: "bg-rose-500/10", text: "text-rose-700", dot: "bg-rose-600" },

  PENDING: { label: "Pending", bg: "bg-amber-500/10", text: "text-amber-700", dot: "bg-amber-600" },
  ACCEPTED: { label: "Accepted", bg: "bg-blue-500/10", text: "text-blue-700", dot: "bg-blue-600" },
  CONFIRMED: { label: "Confirmed", bg: "bg-sky-500/10", text: "text-sky-700", dot: "bg-sky-600" },
  PREPARING: { label: "Preparing", bg: "bg-indigo-500/10", text: "text-indigo-700", dot: "bg-indigo-600" },
  READY_FOR_PICKUP: { label: "Ready for Pickup", bg: "bg-purple-500/10", text: "text-purple-700", dot: "bg-purple-600" },
  IN_TRANSIT: { label: "In Transit", bg: "bg-cyan-500/10", text: "text-cyan-700", dot: "bg-cyan-600" },
  DELIVERED: { label: "Delivered", bg: "bg-teal-500/10", text: "text-teal-700", dot: "bg-teal-600" },
  COMPLETED: { label: "Completed", bg: "bg-emerald-500/10", text: "text-emerald-700", dot: "bg-emerald-600" },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-500/10", text: "text-rose-700", dot: "bg-rose-600" },
  DISPUTED: { label: "Disputed", bg: "bg-red-500/10", text: "text-red-700", dot: "bg-red-600" },
  REJECTED: { label: "Rejected", bg: "bg-rose-500/10", text: "text-rose-700", dot: "bg-rose-600" },

  WITHDRAWN: { label: "Withdrawn", bg: "bg-stone-500/10", text: "text-stone-700", dot: "bg-stone-600" },
  EXPIRED: { label: "Expired", bg: "bg-stone-500/10", text: "text-stone-700", dot: "bg-stone-600" },

  VERIFIED: { label: "Verified", bg: "bg-emerald-500/10", text: "text-emerald-700", dot: "bg-emerald-600" },
  UNVERIFIED: { label: "Unverified", bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = STATUS_CONFIG[status as StatusType] || {
    label: status,
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
