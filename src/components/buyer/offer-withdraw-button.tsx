"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withdrawOffer } from "@/actions/buyer";

export function OfferWithdrawButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!confirm("Are you sure you want to withdraw this offer? The farmer will no longer be able to accept it.")) {
      return;
    }

    setIsPending(true);
    setError(null);
    const res = await withdrawOffer(offerId);
    setIsPending(false);

    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <Button
        variant="outline"
        size="sm"
        onClick={handleWithdraw}
        disabled={isPending}
        className="text-stone-700 hover:bg-stone-50 border-stone-200 text-xs h-8 px-2.5"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <Undo2 className="h-3.5 w-3.5 mr-1 text-stone-500" />
            Withdraw
          </>
        )}
      </Button>
    </div>
  );
}
