import { LogOut } from "lucide-react";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <Button type="submit" variant="ghost" size="sm" className={cn("w-full justify-start gap-2")}>
        <LogOut aria-hidden="true" />
        Sign out
      </Button>
    </form>
  );
}
