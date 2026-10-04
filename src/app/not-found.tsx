import Link from "next/link";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
        <HelpCircle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Page Not Found</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-6">
        <Button asChild variant="default">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
