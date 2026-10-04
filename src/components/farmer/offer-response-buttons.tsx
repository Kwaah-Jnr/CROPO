"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { acceptOffer, rejectOffer } from "@/actions/farmer";
import { Button } from "@/components/ui/button";

export function OfferResponseButtons({ offerId }: { offerId: string }) {
  const [loadingAction, setLoadingAction] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  async function handleAccept() {
    if (!confirm("Are you sure you want to accept this offer? This will automatically generate a confirmed order.")) return;
    setLoadingAction("accept");
    setError(null);
    const res = await acceptOffer(offerId);
    setLoadingAction(null);
    if (!res.ok) {
      setError(res.error);
    } else {
      setDoneMessage(res.message || "Offer accepted! Order created.");
    }
  }

  async function handleReject() {
    if (!confirm("Decline this purchase offer?")) return;
    setLoadingAction("reject");
    setError(null);
    const res = await rejectOffer(offerId);
    setLoadingAction(null);
    if (!res.ok) {
      setError(res.error);
    } else {
      setDoneMessage("Offer declined.");
    }
  }

  if (doneMessage) {
    return (
      <span className="text-xs font-semibold text-primary">
        ✓ {doneMessage}
      </span>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t">
      {error ? <p className="text-xs text-destructive w-full">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={loadingAction !== null}
          className="h-8 text-xs bg-primary text-primary-foreground font-medium"
        >
          {loadingAction === "accept" ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Accepting...
            </>
          ) : (
            <>
              <Check className="mr-1.5 size-3.5" /> Accept & Create Order
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReject}
          disabled={loadingAction !== null}
          className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          {loadingAction === "reject" ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Declining...
            </>
          ) : (
            <>
              <X className="mr-1.5 size-3.5" /> Decline
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
