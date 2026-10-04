"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Unhandled App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while processing your request. Please try again.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
