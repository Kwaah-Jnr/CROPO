import Link from "next/link";

import { cn } from "@/lib/utils";

/** Text wordmark. Replace with the final brand mark when available. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center text-xl font-bold tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-offset-4 rounded-sm",
        className,
      )}
    >
      Cropo
    </Link>
  );
}
