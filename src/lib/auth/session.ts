import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { dashboardPathForRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { SessionProfile, UserRole } from "@/types/domain";

/**
 * Server-side session helpers.
 *
 * - Identity is validated with the Supabase Auth server (`getUser`), never from an
 *   unverified cookie payload.
 * - Role comes from `profiles.role` in the database (RLS-protected, not user-editable),
 *   never from user metadata or client input.
 * - Results are memoised per request with React `cache`.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getCurrentProfile = cache(async (): Promise<SessionProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
});

/** For pages/layouts: redirect to login when signed out. */
export async function requireProfile(nextPath?: string): Promise<SessionProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${query}`);
  }
  return profile;
}

/**
 * For pages/layouts: require one of the given roles. Users with another role are sent to
 * their own dashboard; they never see the protected content.
 */
export async function requireRole(roles: UserRole | readonly UserRole[], nextPath?: string) {
  const allowed: readonly UserRole[] = typeof roles === "string" ? [roles] : roles;
  const profile = await requireProfile(nextPath);
  if (!allowed.includes(profile.role)) {
    redirect(dashboardPathForRole(profile.role));
  }
  return profile;
}

export type AuthorizationResult =
  | { ok: true; profile: SessionProfile }
  | { ok: false; error: string };

/**
 * For Server Actions: authorise without redirecting so the action can return a typed
 * error. Every mutating action must call this first.
 */
export async function authorize(roles: UserRole | readonly UserRole[]): Promise<AuthorizationResult> {
  const allowed: readonly UserRole[] = typeof roles === "string" ? [roles] : roles;
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Please sign in to continue." };
  if (!allowed.includes(profile.role)) {
    return { ok: false, error: "You do not have permission to perform this action." };
  }
  return { ok: true, profile };
}
