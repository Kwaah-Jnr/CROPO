/**
 * Maps low-level Supabase/Postgres/Auth errors to safe, user-facing messages.
 * Raw error details are logged server-side only.
 */

type ErrorLike = { code?: string; message?: string; status?: number } | null | undefined;

const POSTGRES_MESSAGES: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "This item is linked to other records and cannot be changed.",
  "23514": "Some values are not allowed. Please check the form and try again.",
  "23502": "A required value is missing.",
  "22023": "Some values are not allowed.",
  "22P02": "Some values are in an invalid format.",
  "42501": "You do not have permission to perform this action.",
  PGRST116: "The requested item could not be found.",
  PGRST301: "Your session has expired. Please sign in again.",
};

export function toUserMessage(error: ErrorLike, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code && POSTGRES_MESSAGES[error.code]) return POSTGRES_MESSAGES[error.code];
  return fallback;
}

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email address before signing in.",
  user_already_exists: "An account with this email already exists.",
  email_exists: "An account with this email already exists.",
  weak_password: "Please choose a stronger password.",
  over_email_send_rate_limit: "Too many emails sent. Please wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a moment and try again.",
  signup_disabled: "New signups are currently disabled.",
  otp_expired: "This link has expired. Please request a new one.",
};

export function toAuthMessage(error: ErrorLike, fallback = "We couldn't complete that request. Please try again."): string {
  if (!error) return fallback;
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (error.status === 429) return AUTH_MESSAGES.over_request_rate_limit;
  return fallback;
}

export function logServerError(context: string, error: unknown) {
  // Centralised so a monitoring service can be plugged in later.
  console.error(`[cropo] ${context}`, error);
}
