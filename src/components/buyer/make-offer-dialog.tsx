"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Tag } from "lucide-react";

import { makeOffer } from "@/actions/buyer";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OfferListingProps = {
  id: string;
  crop_name: string;
  variety?: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
};

export function MakeOfferDialog({
  listing,
  userRole,
  isLoggedIn,
}: {
  listing: OfferListingProps;
  userRole?: string | null;
  isLoggedIn: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState<number>(listing.quantity_available > 0 ? Math.min(listing.quantity_available, 20) : 1);
  const [offerPrice, setOfferPrice] = useState<number>(listing.price_per_unit);
  const [message, setMessage] = useState("");

  const [state, formAction, isPending] = useActionState(makeOffer, null);

  const isSuccess = state !== null && state.ok;
  const isFailure = state !== null && !state.ok;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  if (!isLoggedIn) {
    return (
      <Button asChild variant="outline" size="lg" className="w-full h-11 text-sm font-semibold">
        <a href={`/login?next=/marketplace/${listing.id}`}>
          <Tag className="mr-2 size-4" /> Make Offer
        </a>
      </Button>
    );
  }

  if (userRole !== "BUYER") {
    return (
      <Button disabled variant="outline" size="lg" className="w-full h-11 text-sm font-semibold opacity-70">
        <Tag className="mr-2 size-4" /> Make Offer (Commercial Buyers Only)
      </Button>
    );
  }

  const totalOffer = Math.max(0, quantity) * Math.max(0, offerPrice);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="lg"
        className="w-full h-11 text-sm font-semibold hover:border-primary/40"
      >
        <Tag className="mr-2 size-4 text-primary" /> Make Offer
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Propose Custom Offer</h2>
                <p className="text-xs text-muted-foreground">
                  {listing.crop_name} {listing.variety ? `(${listing.variety})` : ""} — List price: GH₵ {listing.price_per_unit.toFixed(2)} / {listing.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {isSuccess ? (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-5 text-center space-y-2">
                <CheckCircle2 className="mx-auto size-8 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Offer Submitted to Farmer!</h3>
                <p className="text-xs text-muted-foreground">{state.message}</p>
                <p className="text-[11px] text-muted-foreground">
                  You can track or withdraw your offer anytime in your <strong>Buyer Dashboard &gt; Offers</strong> tab.
                </p>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="listing_id" value={listing.id} />

                {isFailure && state.error ? (
                  <FormMessage variant="error">
                    <p className="text-xs font-semibold">{state.error}</p>
                  </FormMessage>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  {/* Proposed Volume */}
                  <div className="space-y-1.5">
                    <Label htmlFor="offer_quantity" className="text-xs font-medium">
                      Desired Volume ({listing.unit}) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="offer_quantity"
                      name="quantity"
                      type="number"
                      step="any"
                      min="0.1"
                      max={listing.quantity_available}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      required
                    />
                    <FieldError id="qty-err" messages={isFailure ? state.fieldErrors?.quantity : undefined} />
                  </div>

                  {/* Proposed Price per unit */}
                  <div className="space-y-1.5">
                    <Label htmlFor="offer_price" className="text-xs font-medium">
                      Offered Price (GH₵ per {listing.unit}) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="offer_price"
                      name="price_per_unit"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(Number(e.target.value))}
                      required
                    />
                    <FieldError id="price-err" messages={isFailure ? state.fieldErrors?.price_per_unit : undefined} />
                  </div>
                </div>

                {/* Message to Farmer */}
                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-xs font-medium">
                    Terms & Negotiation Message (optional)
                  </Label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    placeholder="e.g. Can take the whole batch if delivered to Tema next Tuesday. Standard grading required..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <FieldError id="msg-err" messages={isFailure ? state.fieldErrors?.message : undefined} />
                </div>

                {/* Live Proposal Summary */}
                <div className="rounded-lg border bg-muted/40 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Listed Price:</span>
                    <span className="tabular">GH₵ {listing.price_per_unit.toFixed(2)} / {listing.unit}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Your Counter Rate:</span>
                    <span className="font-semibold text-foreground tabular">
                      GH₵ {Number(offerPrice || 0).toFixed(2)} / {listing.unit}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-foreground">
                    <span>Total Proposed Value:</span>
                    <span className="text-primary tabular">
                      GH₵ {totalOffer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    The farmer can accept or decline this offer. If accepted, an order will be generated.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending || quantity <= 0 || offerPrice <= 0}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Submit Offer to Farmer"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
