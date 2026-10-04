"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSavedSupplier } from "@/actions/buyer";

interface SaveSupplierButtonProps {
  farmerId: string;
  initialSaved?: boolean;
}

export function SaveSupplierButton({
  farmerId,
  initialSaved = true,
}: SaveSupplierButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsPending(true);
    setError(null);
    const res = await toggleSavedSupplier(farmerId);
    setIsPending(false);

    if (res.ok) {
      setIsSaved(res.data?.saved ?? !isSaved);
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
        onClick={handleToggle}
        disabled={isPending}
        className={`h-8 px-2.5 text-xs font-medium gap-1.5 ${
          isSaved
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "text-stone-700 hover:bg-stone-50 border-stone-200"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isSaved ? (
          <>
            <BookmarkCheck className="h-3.5 w-3.5 text-emerald-700" />
            Saved
          </>
        ) : (
          <>
            <Bookmark className="h-3.5 w-3.5 text-stone-500" />
            Save Supplier
          </>
        )}
      </Button>
    </div>
  );
}
