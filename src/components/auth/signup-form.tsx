"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { signUp } from "@/actions/auth";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/utils/action-result";
import type { UserRole } from "@/types/domain";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("FARMER");
  const [state, formAction] = useActionState<ActionState, FormData>(signUp, null);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-xs sm:p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create your Cropo account</h1>
        <p className="text-sm text-muted-foreground">
          Join Ghana&apos;s agricultural trading marketplace
        </p>
      </div>

      {state && state.ok && state.message ? (
        <FormMessage variant="success">{state.message}</FormMessage>
      ) : null}

      {state && !state.ok ? (
        <FormMessage variant="error">{state.error}</FormMessage>
      ) : null}

      <form action={formAction} className="space-y-4">
        {/* Role Selection */}
        <div className="space-y-2">
          <Label>I want to join as a:</Label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-colors ${
                selectedRole === "FARMER"
                  ? "border-primary bg-primary/5 font-medium text-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="role"
                value="FARMER"
                checked={selectedRole === "FARMER"}
                onChange={() => setSelectedRole("FARMER")}
                className="sr-only"
              />
              <span className="text-sm font-semibold">Farmer</span>
              <span className="text-xs text-muted-foreground mt-0.5">Sell produce</span>
            </label>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border p-3 text-center transition-colors ${
                selectedRole === "BUYER"
                  ? "border-primary bg-primary/5 font-medium text-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="role"
                value="BUYER"
                checked={selectedRole === "BUYER"}
                onChange={() => setSelectedRole("BUYER")}
                className="sr-only"
              />
              <span className="text-sm font-semibold">Buyer</span>
              <span className="text-xs text-muted-foreground mt-0.5">Source produce</span>
            </label>
          </div>
          <FieldError
            id="role-error"
            messages={state && !state.ok ? state.fieldErrors?.role : undefined}
          />
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            defaultValue={state && !state.ok ? state.values?.fullName : ""}
            placeholder="Kwame Mensah"
            aria-describedby={state && !state.ok && state.fieldErrors?.fullName ? "fullName-error" : undefined}
          />
          <FieldError
            id="fullName-error"
            messages={state && !state.ok ? state.fieldErrors?.fullName : undefined}
          />
        </div>

        {/* Business Name (for Buyers) */}
        {selectedRole === "BUYER" ? (
          <div className="space-y-2">
            <Label htmlFor="businessName">
              Business / Organization Name <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="businessName"
              name="businessName"
              type="text"
              autoComplete="organization"
              defaultValue={state && !state.ok ? state.values?.businessName : ""}
              placeholder="e.g. Accra Fresh Foods Ltd"
              aria-describedby={state && !state.ok && state.fieldErrors?.businessName ? "businessName-error" : undefined}
            />
            <FieldError
              id="businessName-error"
              messages={state && !state.ok ? state.fieldErrors?.businessName : undefined}
            />
          </div>
        ) : null}

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state && !state.ok ? state.values?.email : ""}
            placeholder="kwame@example.com"
            aria-describedby={state && !state.ok && state.fieldErrors?.email ? "email-error" : undefined}
          />
          <FieldError
            id="email-error"
            messages={state && !state.ok ? state.fieldErrors?.email : undefined}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            aria-describedby={state && !state.ok && state.fieldErrors?.password ? "password-error" : undefined}
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters with letters and numbers.
          </p>
          <FieldError
            id="password-error"
            messages={state && !state.ok ? state.fieldErrors?.password : undefined}
          />
        </div>

        <SubmitButton />
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
