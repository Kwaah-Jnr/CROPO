"use server";

import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { failure, success, type ActionResult } from "@/lib/utils/action-result";
import { logServerError } from "@/lib/utils/errors";

export async function reviewVerificationSubmission(input: {
  submissionId: string;
  status: "APPROVED" | "REJECTED";
  reviewNotes?: string;
}): Promise<ActionResult<{ submissionId: string; status: "APPROVED" | "REJECTED" }>> {
  const auth = await authorize("ADMIN");
  if (!auth.ok) {
    return failure("Only administrators can review verification submissions.");
  }

  if (!["APPROVED", "REJECTED"].includes(input.status)) {
    return failure("Invalid review status. Must be APPROVED or REJECTED.");
  }

  const supabase = await createClient();

  // Call the admin review RPC which stamps reviewer and updates profile/farm status
  const { data: updated, error } = await supabase.rpc("admin_review_verification_submission", {
    p_submission_id: input.submissionId,
    p_status: input.status,
    p_review_notes: input.reviewNotes?.trim() || undefined,
  });

  if (error || !updated) {
    logServerError("reviewVerificationSubmission", { message: error?.message });
    return failure(error?.message || "Failed to update verification submission.");
  }

  revalidatePath("/dashboard/farmer/verification");
  revalidatePath("/dashboard/admin");

  return success(
    { submissionId: input.submissionId, status: input.status },
    `Verification submission marked as ${input.status}.`
  );
}
