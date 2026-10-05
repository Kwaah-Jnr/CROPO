"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <form action={signOut} onSubmit={handleSubmit} className={className}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={isPending}
        className={cn("w-full justify-start gap-2")}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut aria-hidden="true" />
        )}
        <span>{isPending ? "Signing out..." : "Sign out"}</span>
      </Button>
    </form>
  );
}

