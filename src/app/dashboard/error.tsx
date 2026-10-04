"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Unable to load dashboard</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Could not retrieve your dashboard information. Please try again.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} variant="default">
          Retry
        </Button>
        <Button asChild variant="outline">
          <a href="/login">Return to Sign In</a>
        </Button>
      </div>
    </div>
  );
}
