"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptFarmerRequestOffer, rejectFarmerRequestOffer } from "@/actions/buyer";

interface RequestOfferActionButtonsProps {
  requestOfferId: string;
  status: string;
}

export function RequestOfferActionButtons({
  requestOfferId,
  status,
}: RequestOfferActionButtonsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "PENDING") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          status === "ACCEPTED"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : status === "REJECTED"
            ? "bg-rose-50 text-rose-700 border border-rose-200"
            : "bg-stone-100 text-stone-600 border border-stone-200"
        }`}
      >
        {status}
      </span>
    );
  }

  const handleAccept = async () => {
    if (!confirm("Are you sure you want to accept this farmer's quote? An order will be created.")) {
      return;
    }

    setLoadingAction("accept");
    setError(null);
    const res = await acceptFarmerRequestOffer(requestOfferId);
    setLoadingAction(null);

    if (res.ok) {
      if (res.data?.orderId) {
        router.push(`/dashboard/buyer/orders/${res.data.orderId}`);
      } else {
        router.refresh();
      }
    } else {
      setError(res.error);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this quote?")) {
      return;
    }

    setLoadingAction("decline");
    setError(null);
    const res = await rejectFarmerRequestOffer(requestOfferId);
    setLoadingAction(null);

    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={loadingAction !== null}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-3"
        >
          {loadingAction === "accept" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              Accept Quote
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDecline}
          disabled={loadingAction !== null}
          className="text-stone-700 hover:bg-stone-50 border-stone-200 text-xs h-8 px-3"
        >
          {loadingAction === "decline" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <X className="h-3.5 w-3.5 mr-1 text-stone-500" />
              Decline
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
