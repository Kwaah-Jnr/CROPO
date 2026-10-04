import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Public Supabase client for unauthenticated, public queries (e.g. public marketplace listings).
 * Does not read or write cookies, allowing static page generation and edge caching without dynamic errors.
 */
export function createPublicClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
