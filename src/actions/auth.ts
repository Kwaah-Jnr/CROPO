"use server";

import { redirect } from "next/navigation";

import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { failure, success, type ActionResult } from "@/lib/utils/action-result";
import { logServerError, toAuthMessage } from "@/lib/utils/errors";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { echoValues, readFormFields, toFieldErrors } from "@/lib/validation/form-data";

export async function signUp(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const raw = readFormFields(formData, ["role", "fullName", "businessName", "email", "password"]);
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues(raw),
    });
  }

  const { role, fullName, businessName, email, password } = parsed.data;
  const { siteUrl } = getPublicEnv();
  const supabase = await createClient();

  // The role in metadata is only read once, by the `handle_new_user` DB trigger, which
  // rejects anything other than FARMER/BUYER. Afterwards `profiles.role` is authoritative.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
      data: { role, full_name: fullName, business_name: businessName ?? null },
    },
  });

  if (error) {
    logServerError("signUp", { code: error.code, status: error.status, message: error.message });
    return failure(toAuthMessage(error), { values: echoValues(raw) });
  }

  // Email confirmation disabled: user is signed in immediately.
  if (data.session) redirect("/dashboard");

  // Same response whether or not the email was already registered (no account enumeration).
  return success(undefined, "Check your email for a confirmation link to activate your account.");
}

export async function signIn(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const raw = readFormFields(formData, ["email", "password", "next"]);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return failure("Please correct the highlighted fields.", {
      fieldErrors: toFieldErrors(parsed.error),
      values: echoValues({ email: raw.email }),
    });
  }

  const supabase = await createClient();

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore local signout error
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code !== "invalid_credentials") {
      logServerError("signIn", { code: error.code, status: error.status, message: error.message });
    }
    return failure(toAuthMessage(error), { values: echoValues({ email: raw.email }) });
  }

  redirect(safeRedirectPath(raw.next));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    logServerError("signOut", { code: error?.code, message: error?.message });
  }
  redirect("/login");
}
