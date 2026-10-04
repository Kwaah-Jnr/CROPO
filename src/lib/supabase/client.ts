import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/** Supabase client for Client Components. Uses the anon key; RLS always applies. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
