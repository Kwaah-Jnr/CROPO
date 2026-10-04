"use client";

import { useActionState } from "react";
import { Loader2, Save, Building2, User } from "lucide-react";
import { updateBuyerProfile } from "@/actions/buyer";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GHANA_REGIONS } from "@/config/regions";
import { BUSINESS_TYPES } from "@/lib/constants";

interface BuyerProfileFormProps {
  initialProfile: {
    full_name: string;
    phone: string | null;
    region: string | null;
    city: string | null;
  };
  initialBuyerProfile: {
    business_name: string | null;
    business_type: string | null;
    verification_status: string;
  } | null;
}

export function BuyerProfileForm({
  initialProfile,
  initialBuyerProfile,
}: BuyerProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateBuyerProfile, null);

  const isSuccess = state !== null && state.ok;
  const isFailure = state !== null && !state.ok;

  return (
    <form action={formAction} className="space-y-6">
      {isSuccess && (
        <FormMessage variant="success">
          {state.message || "Business profile updated successfully."}
        </FormMessage>
      )}
      {isFailure && (
        <FormMessage variant="error">
          {state.error || "Failed to update profile."}
        </FormMessage>
      )}

      {/* Contact Person Details */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <User className="h-4 w-4 text-emerald-800" />
          <h2 className="text-sm font-semibold text-foreground font-display">
            Contact Person Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-xs font-semibold">
              Contact Representative Name <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={initialProfile.full_name || ""}
              placeholder="e.g. Kwame Mensah"
              required
              className="text-sm h-10"
            />
            {isFailure && (
              <FieldError id="full_name-error" messages={state.fieldErrors?.full_name} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-semibold">
              Primary Phone Number
            </Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={initialProfile.phone || ""}
              placeholder="e.g. 0244123456"
              className="text-sm h-10"
            />
            {isFailure && (
              <FieldError id="phone-error" messages={state.fieldErrors?.phone} />
            )}
          </div>
        </div>
      </div>

      {/* Commercial Business Profile */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Building2 className="h-4 w-4 text-emerald-800" />
          <h2 className="text-sm font-semibold text-foreground font-display">
            Commercial Business Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="business_name" className="text-xs font-semibold">
              Company / Entity Trade Name
            </Label>
            <Input
              id="business_name"
              name="business_name"
              defaultValue={initialBuyerProfile?.business_name || ""}
              placeholder="e.g. Accra Harvest Distributors Ltd"
              className="text-sm h-10"
            />
            {isFailure && (
              <FieldError id="business_name-error" messages={state.fieldErrors?.business_name} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="business_type" className="text-xs font-semibold">
              Business Category
            </Label>
            <select
              id="business_type"
              name="business_type"
              defaultValue={initialBuyerProfile?.business_type || "RETAILER"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-10"
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            {isFailure && (
              <FieldError id="business_type-error" messages={state.fieldErrors?.business_type} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="region" className="text-xs font-semibold">
              Primary Operating Region
            </Label>
            <select
              id="region"
              name="region"
              defaultValue={initialProfile.region || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-10"
            >
              <option value="">Select operating region</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {isFailure && (
              <FieldError id="region-error" messages={state.fieldErrors?.region} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-semibold">
              Operating City / Municipality
            </Label>
            <Input
              id="city"
              name="city"
              defaultValue={initialProfile.city || ""}
              placeholder="e.g. Accra Metro, Kumasi, Tema"
              className="text-sm h-10"
            />
            {isFailure && (
              <FieldError id="city-error" messages={state.fieldErrors?.city} />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm h-10 px-6 gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Profile Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
