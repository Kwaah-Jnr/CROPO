"use client";

import { useActionState } from "react";
import { Loader2, Plus, Sprout, User } from "lucide-react";

import { saveFarm, updateFarmerProfile } from "@/actions/farmer";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GHANA_REGIONS } from "@/config/regions";

type ProfileProps = {
  profile: {
    id: string;
    full_name: string;
    phone: string | null;
    region: string | null;
    city: string | null;
  } | null;
  farmerProfile: {
    bio: string | null;
    years_farming: number | null;
    verification_status: string;
  } | null;
  farms: Array<{
    id: string;
    name: string;
    region: string;
    district: string | null;
    community: string | null;
    size_hectares: number | null;
  }>;
};

export function FarmerProfileForms({ profile, farmerProfile, farms }: ProfileProps) {
  const [profileState, profileAction, isProfilePending] = useActionState(updateFarmerProfile, null);
  const [farmState, farmAction, isFarmPending] = useActionState(saveFarm, null);

  const isProfileFailure = profileState !== null && !profileState.ok;
  const isProfileSuccess = profileState !== null && profileState.ok;
  const profileError = isProfileFailure ? profileState.error : null;
  const profileMessage = isProfileSuccess ? profileState.message : null;
  const profileFieldErrors = isProfileFailure ? profileState.fieldErrors : undefined;

  const isFarmFailure = farmState !== null && !farmState.ok;
  const isFarmSuccess = farmState !== null && farmState.ok;
  const farmError = isFarmFailure ? farmState.error : null;
  const farmMessage = isFarmSuccess ? farmState.message : null;
  const farmFieldErrors = isFarmFailure ? farmState.fieldErrors : undefined;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* PERSONAL & FARMING BACKGROUND FORM */}
      <form action={profileAction} className="rounded-xl border bg-card p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b pb-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Personal & Farming Background</h2>
            <p className="text-xs text-muted-foreground">
              These details help verified commercial buyers know who they are trading with.
            </p>
          </div>
        </div>

        {profileError ? (
          <FormMessage variant="error">
            <p className="font-semibold">{profileError}</p>
          </FormMessage>
        ) : profileMessage ? (
          <FormMessage variant="success">
            <p className="font-semibold">{profileMessage}</p>
          </FormMessage>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile?.full_name || ""}
              required
            />
            <FieldError id="full_name-error" messages={profileFieldErrors?.full_name} />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number (Private)</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="e.g. 0244123456"
              defaultValue={profile?.phone || ""}
            />
            <p className="text-[11px] text-muted-foreground">
              Used strictly for authenticated order communications. Never exposed publicly.
            </p>
            <FieldError id="phone-error" messages={profileFieldErrors?.phone} />
          </div>

          {/* Region */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-region">Primary Region</Label>
            <select
              id="profile-region"
              name="region"
              defaultValue={profile?.region || "Ashanti"}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select Region</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r} Region
                </option>
              ))}
            </select>
            <FieldError id="region-error" messages={profileFieldErrors?.region} />
          </div>

          {/* City / District */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-city">City / Town / District</Label>
            <Input
              id="profile-city"
              name="city"
              placeholder="e.g. Akomadan, Offinso North"
              defaultValue={profile?.city || ""}
            />
            <FieldError id="city-error" messages={profileFieldErrors?.city} />
          </div>

          {/* Years Farming */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="years_farming">Years of Commercial Farming Experience</Label>
            <Input
              id="years_farming"
              name="years_farming"
              type="number"
              min="0"
              max="80"
              placeholder="e.g. 12"
              defaultValue={
                farmerProfile?.years_farming !== null && farmerProfile?.years_farming !== undefined
                  ? String(farmerProfile.years_farming)
                  : ""
              }
              className="max-w-xs"
            />
            <FieldError id="years_farming-error" messages={profileFieldErrors?.years_farming} />
          </div>

          {/* Bio */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">Farming Bio / Background</Label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Describe your cultivation experience, primary crops produced, farming methods, and cooperative associations..."
              defaultValue={farmerProfile?.bio || ""}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <FieldError id="bio-error" messages={profileFieldErrors?.bio} />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button type="submit" size="sm" disabled={isProfilePending}>
            {isProfilePending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Profile Changes"
            )}
          </Button>
        </div>
      </form>

      {/* REGISTERED FARM HOLDINGS */}
      <div className="rounded-xl border bg-card p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b pb-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sprout className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Farm Holdings & Acreage</h2>
            <p className="text-xs text-muted-foreground">
              Register your farm location and acreage to associate with produce listings.
            </p>
          </div>
        </div>

        {/* Existing farms list */}
        {farms.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {farms.map((f) => (
              <div key={f.id} className="rounded-lg border bg-background p-4 space-y-1.5">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-foreground text-sm">{f.name}</h4>
                  <span className="text-[11px] rounded bg-primary/10 px-2 py-0.5 text-primary font-medium">
                    {f.size_hectares ? `${f.size_hectares} Hectares` : "Registered"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {f.community ? `${f.community}, ` : ""}
                  {f.district ? `${f.district}, ` : ""}
                  {f.region} Region
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
            No farm holdings registered yet. Add your primary farm below.
          </div>
        )}

        {/* ADD FARM FORM */}
        <form action={farmAction} className="rounded-lg border bg-muted/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground inline-flex items-center gap-1.5">
            <Plus className="size-4 text-primary" /> Add New Farm Holding
          </h3>

          {farmError ? (
            <FormMessage variant="error">
              <p className="font-semibold">{farmError}</p>
            </FormMessage>
          ) : farmMessage ? (
            <FormMessage variant="success">
              <p className="font-semibold">{farmMessage}</p>
            </FormMessage>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="farm-name">
                Farm Name <span className="text-destructive">*</span>
              </Label>
              <Input id="farm-name" name="name" placeholder="e.g. Afram Valley Farm" required />
              <FieldError id="name-error" messages={farmFieldErrors?.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="farm-region">
                Region <span className="text-destructive">*</span>
              </Label>
              <select
                id="farm-region"
                name="region"
                defaultValue="Ashanti"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} Region
                  </option>
                ))}
              </select>
              <FieldError id="farm-region-error" messages={farmFieldErrors?.region} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <Input id="district" name="district" placeholder="e.g. Offinso North District" />
              <FieldError id="district-error" messages={farmFieldErrors?.district} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="community">Community / Nearest Town</Label>
              <Input id="community" name="community" placeholder="e.g. Akomadan" />
              <FieldError id="community-error" messages={farmFieldErrors?.community} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="size_hectares">Size (in Hectares)</Label>
              <Input
                id="size_hectares"
                name="size_hectares"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 15.5"
                className="max-w-xs"
              />
              <FieldError id="size_hectares-error" messages={farmFieldErrors?.size_hectares} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" variant="outline" disabled={isFarmPending}>
              {isFarmPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Farm Holding"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
