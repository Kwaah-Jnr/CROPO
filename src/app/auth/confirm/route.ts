import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Email confirmation landing route.
 * Supports both the token-hash link (recommended; works across devices) and the
 * PKCE `code` link (default Supabase template; same browser only).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();

  if (tokenHash && type && (OTP_TYPES as readonly string[]).includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    if (!error) redirect(next);
    logServerError("auth/confirm verifyOtp", { code: error.code, message: error.message });
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    logServerError("auth/confirm exchangeCode", { code: error.code, message: error.message });
  }

  redirect("/login?error=confirmation_failed");
}
