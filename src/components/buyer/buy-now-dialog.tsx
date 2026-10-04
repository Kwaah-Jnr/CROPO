"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShoppingCart, Truck } from "lucide-react";

import { createBuyNowOrder } from "@/actions/buyer";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BuyNowListingProps = {
  id: string;
  crop_name: string;
  variety?: string | null;
  unit: string;
  price_per_unit: number;
  quantity_available: number;
  delivery_available?: boolean;
  city?: string | null;
  region: string;
};

export function BuyNowDialog({
  listing,
  userRole,
  isLoggedIn,
}: {
  listing: BuyNowListingProps;
  userRole?: string | null;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState<number>(listing.quantity_available > 0 ? Math.min(listing.quantity_available, 10) : 1);
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">(
    listing.delivery_available ? "DELIVERY" : "PICKUP"
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [state, formAction, isPending] = useActionState(createBuyNowOrder, null);

  const isSuccess = state !== null && state.ok;
  const isFailure = state !== null && !state.ok;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        router.push("/dashboard/buyer/orders");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  if (!isLoggedIn) {
    return (
      <Button asChild size="lg" className="w-full h-11 text-sm font-semibold">
        <a href={`/login?next=/marketplace/${listing.id}`}>
          <ShoppingCart className="mr-2 size-4" /> Buy Now
        </a>
      </Button>
    );
  }

  if (userRole !== "BUYER") {
    return (
      <Button disabled size="lg" variant="outline" className="w-full h-11 text-sm font-semibold opacity-70">
        Buy Now (Commercial Buyers Only)
      </Button>
    );
  }

  const subtotal = Math.max(0, quantity) * listing.price_per_unit;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="w-full h-11 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <ShoppingCart className="mr-2 size-4" /> Buy Now
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Initiate Direct Purchase</h2>
                <p className="text-xs text-muted-foreground">
                  {listing.crop_name} {listing.variety ? `(${listing.variety})` : ""} — {listing.city ? `${listing.city}, ` : ""}{listing.region}
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
                <h3 className="font-semibold text-foreground text-sm">Purchase Initiated!</h3>
                <p className="text-xs text-muted-foreground">{state.message}</p>
                <p className="text-[11px] text-muted-foreground">Redirecting to your orders...</p>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="listing_id" value={listing.id} />
                <input type="hidden" name="delivery_method" value={deliveryMethod} />

                {isFailure && state.error ? (
                  <FormMessage variant="error">
                    <p className="text-xs font-semibold">{state.error}</p>
                  </FormMessage>
                ) : null}

                {/* Volume Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Label htmlFor="buy_quantity" className="font-medium">
                      Order Volume ({listing.unit}) <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-muted-foreground">
                      Max available: <strong>{listing.quantity_available.toLocaleString()} {listing.unit}</strong>
                    </span>
                  </div>
                  <Input
                    id="buy_quantity"
                    name="quantity"
                    type="number"
                    step="any"
                    min="0.1"
                    max={listing.quantity_available}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                  />
                  <FieldError id="quantity-error" messages={isFailure ? state.fieldErrors?.quantity : undefined} />
                </div>

                {/* Fulfillment Method */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Fulfillment Method <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("PICKUP")}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-xs text-left transition-all ${
                        deliveryMethod === "PICKUP"
                          ? "border-primary bg-primary/5 font-semibold text-foreground ring-1 ring-primary"
                          : "border-input bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <ShoppingCart className="size-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Farm Pickup</p>
                        <p className="text-[10px] text-muted-foreground">Collect at farm gate</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("DELIVERY")}
                      disabled={!listing.delivery_available}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-xs text-left transition-all ${
                        !listing.delivery_available
                          ? "opacity-50 cursor-not-allowed border-dashed bg-muted/20"
                          : deliveryMethod === "DELIVERY"
                          ? "border-primary bg-primary/5 font-semibold text-foreground ring-1 ring-primary"
                          : "border-input bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <Truck className="size-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Delivery</p>
                        <p className="text-[10px] text-muted-foreground">
                          {listing.delivery_available ? "Dispatched to destination" : "Not offered by farmer"}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Delivery Address (if Delivery) */}
                {deliveryMethod === "DELIVERY" && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <Label htmlFor="delivery_address" className="text-xs font-medium">
                      Destination Address (Ghana) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="delivery_address"
                      name="delivery_address"
                      placeholder="e.g. Accra Central Market Warehouse 4, Greater Accra"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                    />
                    <FieldError id="address-error" messages={isFailure ? state.fieldErrors?.delivery_address : undefined} />
                  </div>
                )}

                {/* Logistics Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-medium">Fulfillment Instructions / Notes</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    placeholder="Specify pallet requirements, preferred dispatch schedule, or inspection contact..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Subtotal Calculation Box */}
                <div className="rounded-lg border bg-muted/40 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Farm-Gate Unit Price:</span>
                    <span className="font-semibold text-foreground tabular">GH₵ {listing.price_per_unit.toFixed(2)} / {listing.unit}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Quantity:</span>
                    <span className="font-semibold text-foreground tabular">{quantity || 0} {listing.unit}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-foreground">
                    <span>Total Purchase Value:</span>
                    <span className="text-primary tabular">GH₵ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Order starts at PENDING. Payment held in secure Cropo trade account upon confirmation.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending || quantity <= 0}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Processing...
                      </>
                    ) : (
                      "Confirm & Place Order"
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
