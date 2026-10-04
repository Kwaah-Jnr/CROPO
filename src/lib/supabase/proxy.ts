import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PAGES = ["/login", "/signup"];

function matches(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Runs on every matched request:
 * 1. Refreshes the Supabase session and writes updated cookies.
 * 2. Optimistic gate: signed-out users are sent away from /dashboard.
 *
 * Role authorisation is NOT done here; it happens server-side in each dashboard
 * layout (`requireRole`) and in every Server Action (`authorize`), backed by RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Do not run code between client creation and getUser(); it refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    const [targetPath, targetQuery] = path.split("?");
    url.pathname = targetPath;
    url.search = targetQuery ? `?${targetQuery}` : "";
    const redirect = NextResponse.redirect(url);
    // Preserve any refreshed auth cookies on the redirect.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}`);
  }

  if (user && matches(pathname, AUTH_PAGES)) {
    return redirectTo("/dashboard");
  }

  return response;
}
