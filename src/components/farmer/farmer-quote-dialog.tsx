"use client";

import { useState, useActionState, useEffect } from "react";
import { Send, Loader2, X } from "lucide-react";
import { submitFarmerRequestOffer } from "@/actions/farmer";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FarmerQuoteDialogProps {
  request: {
    id: string;
    crop_name: string;
    quantity: number;
    unit: string;
    destination_region: string;
    destination_city?: string | null;
    target_price_per_unit?: number | null;
  };
}

export function FarmerQuoteDialog({ request }: FarmerQuoteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(submitFarmerRequestOffer, null);

  const isSuccess = state !== null && state.ok;
  const isFailure = state !== null && !state.ok;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 px-3"
      >
        <Send className="h-3.5 w-3.5 mr-1.5" />
        Send Quote
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <h2 className="text-base font-bold font-display text-foreground">
                Quote for {request.crop_name}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Buyer needs {request.quantity.toLocaleString()} {request.unit} in {request.destination_region}.
                {request.target_price_per_unit && (
                  <span className="block mt-0.5 text-emerald-800 font-medium">
                    Target Budget: GH₵{request.target_price_per_unit.toFixed(2)} / {request.unit}
                  </span>
                )}
              </p>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="request_id" value={request.id} />

              {isSuccess && (
                <FormMessage variant="success">
                  {state.message || "Your quote was submitted to the buyer."}
                </FormMessage>
              )}
              {isFailure && (
                <FormMessage variant="error">
                  {state.error || "Failed to submit quote."}
                </FormMessage>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity" className="text-xs font-semibold">
                    Offered Volume ({request.unit}) <span className="text-rose-600">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="any"
                    min="0.1"
                    defaultValue={request.quantity}
                    required
                    className="h-9 text-xs"
                  />
                  {isFailure && (
                    <FieldError id="quantity-error" messages={state.fieldErrors?.quantity} />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price_per_unit" className="text-xs font-semibold">
                    Unit Price (GH₵ / {request.unit}) <span className="text-rose-600">*</span>
                  </Label>
                  <Input
                    id="price_per_unit"
                    name="price_per_unit"
                    type="number"
                    step="any"
                    min="0.01"
                    defaultValue={request.target_price_per_unit || ""}
                    placeholder="0.00"
                    required
                    className="h-9 text-xs"
                  />
                  {isFailure && (
                    <FieldError id="price_per_unit-error" messages={state.fieldErrors?.price_per_unit} />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="available_date" className="text-xs font-semibold">
                  Available Delivery / Harvest Date
                </Label>
                <Input
                  id="available_date"
                  name="available_date"
                  type="date"
                  className="h-9 text-xs"
                />
                {isFailure && (
                  <FieldError id="available_date-error" messages={state.fieldErrors?.available_date} />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-semibold">
                  Note to Buyer (Optional)
                </Label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Detail your harvest freshness, packaging specs, or delivery terms..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                {isFailure && (
                  <FieldError id="message-error" messages={state.fieldErrors?.message} />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Submitting Quote...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Submit Quote
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
