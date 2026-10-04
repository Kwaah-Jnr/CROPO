"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelBuyingRequest } from "@/actions/buyer";

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this buying request? No further farmer quotes will be received.")) {
      return;
    }

    setIsPending(true);
    setError(null);
    const res = await cancelBuyingRequest(requestId);
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
        onClick={handleCancel}
        disabled={isPending}
        className="text-rose-700 hover:bg-rose-50 border-rose-200 text-xs h-8"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancel Request
          </>
        )}
      </Button>
    </div>
  );
}
