import { getPublicEnv } from "@/lib/env";

/**
 * Resolves a produce image storage path or absolute URL into a valid public URL.
 * Handles Supabase Storage paths (e.g. "farmerId/listingId/photo.jpg"),
 * external CDN URLs (e.g. Unsplash/Pexels), and relative local paths ("/images/...").
 */
export function formatProduceImageUrl(
  storagePathOrUrl: string | null | undefined
): string | null {
  if (!storagePathOrUrl || typeof storagePathOrUrl !== "string") {
    return null;
  }

  const trimmed = storagePathOrUrl.trim();
  if (!trimmed) {
    return null;
  }

  // Already an absolute URL (e.g. Unsplash, Supabase CDN)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Local relative asset (e.g. /images/...)
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // Supabase Storage path: construct public object URL
  try {
    const { supabaseUrl } = getPublicEnv();
    if (!supabaseUrl) return null;
    const cleanUrl = supabaseUrl.replace(/\/+$/, "");
    return `${cleanUrl}/storage/v1/object/public/listing-images/${trimmed}`;
  } catch {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") || "";
    if (!envUrl) return null;
    return `${envUrl}/storage/v1/object/public/listing-images/${trimmed}`;
  }
}
