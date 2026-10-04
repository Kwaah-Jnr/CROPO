import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { publicNav } from "@/config/navigation";

/**
 * Public site header (foundation). Kept static so public pages can be statically
 * rendered; signed-in users are redirected from /login and /signup to their dashboard.
 */
export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              {publicNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
