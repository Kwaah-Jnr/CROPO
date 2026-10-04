import { Logo } from "@/components/shared/logo";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { SessionProfile } from "@/types/domain";

export function DashboardShell({
  profile,
  children,
}: {
  profile: SessionProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo href={`/dashboard/${profile.role.toLowerCase()}`} />
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none text-foreground">{profile.full_name}</p>
          </div>
          <div className="w-28">
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full border-b bg-card p-4 md:w-64 md:border-b-0 md:border-r md:p-6 shrink-0">
          <DashboardNav role={profile.role} />
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
