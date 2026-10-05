"use client";

import { useState } from "react";
import { CheckCircle2, Clock, ExternalLink, FileText, XCircle } from "lucide-react";

import { getVerificationDocumentSignedUrl } from "@/actions/farmer";
import { type FarmerVerificationSubmissionItem } from "@/lib/data/farmer";

interface VerificationHistoryProps {
  submissions: FarmerVerificationSubmissionItem[];
}

export function VerificationHistory({ submissions }: VerificationHistoryProps) {
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  if (submissions.length === 0) return null;

  const handleViewDocument = async (path: string) => {
    try {
      setLoadingDoc(path);
      const res = await getVerificationDocumentSignedUrl(path);
      if (res.ok && res.data.signedUrl) {
        window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(res.ok ? "Document link unavailable." : res.error);
      }
    } catch {
      alert("Failed to retrieve document link.");
    } finally {
      setLoadingDoc(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 shadow-xs">
      <div className="border-b pb-3">
        <h3 className="text-base font-bold text-foreground">Verification Submissions & Audit History</h3>
        <p className="text-xs text-muted-foreground">
          Track the status of your submitted identity and farm documentation.
        </p>
      </div>

      <div className="divide-y">
        {submissions.map((sub) => {
          const isPending = sub.status === "PENDING";
          const isApproved = sub.status === "APPROVED";
          const isRejected = sub.status === "REJECTED";

          return (
            <div key={sub.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {isPending && <Clock className="size-4 text-amber-500 shrink-0" />}
                  {isApproved && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                  {isRejected && <XCircle className="size-4 text-destructive shrink-0" />}

                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      {sub.type === "FARMER_IDENTITY"
                        ? "Farmer Identity Verification"
                        : `Farm Land Audit: ${sub.farm_name || "Registered Farm"}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      Submitted on {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isApproved
                        ? "bg-primary/10 text-primary"
                        : isRejected
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {isApproved ? "Approved" : isRejected ? "Needs Revision / Rejected" : "Under Review"}
                  </span>
                </div>
              </div>

              {/* NOTES / REMARKS */}
              {sub.notes && (
                <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-md">
                  <span className="font-medium text-foreground">Submission Note: </span>
                  {sub.notes}
                </p>
              )}

              {/* ADMIN REVIEW REMARKS */}
              {sub.review_notes && (
                <div
                  className={`text-xs p-3 rounded-md border ${
                    isRejected
                      ? "border-destructive/20 bg-destructive/5 text-destructive"
                      : "border-primary/20 bg-primary/5 text-primary"
                  }`}
                >
                  <span className="font-semibold">Administrator Feedback: </span>
                  <span>{sub.review_notes}</span>
                </div>
              )}

              {/* ATTACHED DOCUMENTS */}
              {sub.document_paths && sub.document_paths.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Attached Private Records ({sub.document_paths.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sub.document_paths.map((docPath, i) => {
                      const filename = docPath.split("/").pop() || `Document ${i + 1}`;
                      const isCurrentlyLoading = loadingDoc === docPath;

                      return (
                        <button
                          key={docPath}
                          type="button"
                          onClick={() => handleViewDocument(docPath)}
                          disabled={isCurrentlyLoading}
                          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                        >
                          <FileText className="size-3 text-primary shrink-0" />
                          <span className="truncate max-w-[140px]">{filename}</span>
                          <ExternalLink className="size-2.5 text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
