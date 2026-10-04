/**
 * Standard return type for every Server Action.
 * Actions never throw raw database/auth errors to the UI.
 */
export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionSuccess<T = undefined> = { ok: true; data: T; message?: string };

export type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
  /** Submitted (non-sensitive) values, so forms can be re-populated after an error. */
  values?: Record<string, string>;
};

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

/** State type for `useActionState`: `null` before the first submission. */
export type ActionState<T = undefined> = ActionResult<T> | null;

export function success<T>(data: T, message?: string): ActionSuccess<T> {
  return { ok: true, data, message };
}

export function failure(
  error: string,
  extra: Omit<ActionFailure, "ok" | "error"> = {},
): ActionFailure {
  return { ok: false, error, ...extra };
}
