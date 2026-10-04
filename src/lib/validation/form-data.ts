import { z } from "zod";

import type { FieldErrors } from "@/lib/utils/action-result";

/** Reads the given string fields from FormData. Files and unknown keys are ignored. */
export function readFormFields<K extends string>(formData: FormData, keys: readonly K[]) {
  const result = {} as Record<K, string | undefined>;
  for (const key of keys) {
    const value = formData.get(key);
    result[key] = typeof value === "string" ? value : undefined;
  }
  return result;
}

/** Converts a Zod error into per-field messages for forms. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/** Strips sensitive fields before echoing values back to a form. */
export function echoValues(
  values: Record<string, string | undefined>,
  omit: readonly string[] = ["password"],
): Record<string, string> {
  const echoed: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && !omit.includes(key)) echoed[key] = value;
  }
  return echoed;
}
