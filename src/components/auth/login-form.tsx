"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signIn } from "@/actions/auth";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/utils/action-result";

function SubmitButton({ isPending }: { isPending: boolean }) {
  const { pending } = useFormStatus();
  const disabled = isPending || pending;
  return (
    <Button type="submit" disabled={disabled} className="w-full">
      {disabled ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const confirmed = searchParams.get("confirmed");
  const errorParam = searchParams.get("error");

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(signIn, null);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-xs sm:p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to Cropo</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and password to access your account
        </p>
      </div>

      {confirmed ? (
        <FormMessage variant="success">
          Your email has been confirmed. You can now sign in.
        </FormMessage>
      ) : null}

      {errorParam === "confirmation_failed" ? (
        <FormMessage variant="error">
          Email confirmation link is invalid or expired.
        </FormMessage>
      ) : null}

      {state && !state.ok ? (
        <FormMessage variant="error">{state.error}</FormMessage>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <fieldset disabled={isPending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state && !state.ok ? state.values?.email : ""}
              placeholder="farmer@example.com"
              aria-describedby={state && !state.ok && state.fieldErrors?.email ? "email-error" : undefined}
            />
            <FieldError
              id="email-error"
              messages={state && !state.ok ? state.fieldErrors?.email : undefined}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-describedby={state && !state.ok && state.fieldErrors?.password ? "password-error" : undefined}
            />
            <FieldError
              id="password-error"
              messages={state && !state.ok ? state.fieldErrors?.password : undefined}
            />
          </div>

          <SubmitButton isPending={isPending} />
        </fieldset>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create account
        </Link>
      </div>
    </div>
  );
}
