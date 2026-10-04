/**
 * Returns a same-origin relative path, or the fallback.
 * Prevents open redirects via `?next=` (e.g. `//evil.com`, `/\evil.com`, `https://…`).
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
