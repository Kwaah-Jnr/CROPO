"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateListingStatus } from "@/actions/farmer";
import { Button } from "@/components/ui/button";

export function ListingStatusToggle({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: string) {
    if (newStatus === "REMOVED") {
      if (!confirm("Are you sure you want to remove this listing? It will no longer be visible.")) {
        return;
      }
    }

    startTransition(async () => {
      await updateListingStatus(listingId, newStatus);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      ) : (
        <>
          {currentStatus === "ACTIVE" ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleStatusChange("PAUSED")}
              title="Pause listing"
              className="text-[11px] h-7 px-2"
            >
              Pause
            </Button>
          ) : currentStatus === "PAUSED" || currentStatus === "DRAFT" ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleStatusChange("ACTIVE")}
              title="Publish active"
              className="text-[11px] h-7 px-2 text-emerald-700 hover:text-emerald-800"
            >
              Activate
            </Button>
          ) : null}

          {currentStatus !== "SOLD_OUT" && currentStatus !== "REMOVED" ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleStatusChange("SOLD_OUT")}
              title="Mark as Sold Out"
              className="text-[11px] h-7 px-2 text-muted-foreground"
            >
              Sold Out
            </Button>
          ) : null}

          {currentStatus !== "REMOVED" ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleStatusChange("REMOVED")}
              title="Remove listing"
              className="text-[11px] h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Remove
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
