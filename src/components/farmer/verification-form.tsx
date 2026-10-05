"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, FileText, Loader2, UploadCloud, X } from "lucide-react";

import { submitFarmerVerification } from "@/actions/farmer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type FarmOption = {
  id: string;
  name: string;
  region: string;
};

interface VerificationFormProps {
  farms: FarmOption[];
  hasPendingIdentitySubmission: boolean;
  isFarmerVerified: boolean;
}

export function VerificationForm({
  farms,
  hasPendingIdentitySubmission,
  isFarmerVerified,
}: VerificationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // If already verified for identity, default to FARM submission if farms exist
  const [submissionType, setSubmissionType] = useState<"FARMER_IDENTITY" | "FARM">(
    isFarmerVerified && farms.length > 0 ? "FARM" : "FARMER_IDENTITY"
  );
  const [farmId, setFarmId] = useState<string>(farms[0]?.id || "");
  const [notes, setNotes] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const combined = [...selectedFiles, ...filesArray];

    if (combined.length > 5) {
      setErrorMessage("Maximum of 5 documents allowed per submission.");
      return;
    }

    for (const file of filesArray) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowed.includes(file.type)) {
        setErrorMessage(`"${file.name}" has an unsupported format. Please use PDF, JPEG, PNG, or WEBP.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the 10MB size limit.`);
        return;
      }
    }

    setSelectedFiles(combined);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedFiles.length === 0) {
      setErrorMessage("Please attach at least one verification document (e.g. Ghana Card, Land Deed, or Lease).");
      return;
    }

    if (submissionType === "FARM" && !farmId) {
      setErrorMessage("Please select a farm holding to verify.");
      return;
    }

    const formData = new FormData();
    formData.append("type", submissionType);
    if (submissionType === "FARM") {
      formData.append("farm_id", farmId);
    }
    formData.append("notes", notes);
    selectedFiles.forEach((file) => {
      formData.append("documents", file);
    });

    startTransition(async () => {
      const result = await submitFarmerVerification(null, formData);
      if (!result.ok) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage(result.message || "Verification submitted successfully.");
        setSelectedFiles([]);
        setNotes("");
        router.refresh();
      }
    });
  };

  if (isFarmerVerified && farms.length === 0) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-2">
        <CheckCircle2 className="size-8 text-primary mx-auto" />
        <h3 className="font-semibold text-foreground">Identity Verified</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Your personal farmer identity is authenticated. To verify individual farm acreage and location, register a farm holding first in your Farm Profile.
        </p>
      </div>
    );
  }

  if (hasPendingIdentitySubmission && submissionType === "FARMER_IDENTITY" && farms.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/40 p-6 text-center space-y-2">
        <Clock className="size-8 text-muted-foreground mx-auto" />
        <h3 className="font-semibold text-foreground">Identity Submission Under Review</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Your verification documents have been received and are currently undergoing administrative audit. You will be notified once reviewed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-6 shadow-xs">
      <div className="space-y-1 border-b pb-4">
        <h3 className="text-base font-bold text-foreground">Submit Verification Credentials</h3>
        <p className="text-xs text-muted-foreground">
          Upload official Ghanaian identification or land records for administrative verification.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* SUBMISSION TYPE SELECTOR */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Verification Scope</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSubmissionType("FARMER_IDENTITY")}
            disabled={isFarmerVerified || hasPendingIdentitySubmission}
            className={`rounded-lg border p-3 text-left transition-all text-xs ${
              submissionType === "FARMER_IDENTITY"
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "border-input hover:bg-muted/50 text-foreground"
            } ${isFarmerVerified || hasPendingIdentitySubmission ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="font-medium">1. Farmer Identity Verification</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {isFarmerVerified
                ? "✓ Identity already verified"
                : hasPendingIdentitySubmission
                ? "⏳ Pending review"
                : "Ghana Card or National ID verification for community standing."}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubmissionType("FARM")}
            disabled={farms.length === 0}
            className={`rounded-lg border p-3 text-left transition-all text-xs ${
              submissionType === "FARM"
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "border-input hover:bg-muted/50 text-foreground"
            } ${farms.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="font-medium">2. Farm Land Holding Verification</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {farms.length === 0
                ? "Register a farm holding first to submit land verification"
                : "Land title, indenture, chief grant, or cooperative audit."}
            </div>
          </button>
        </div>
      </div>

      {/* FARM SELECTOR (IF APPLICABLE) */}
      {submissionType === "FARM" && (
        <div className="space-y-2">
          <Label htmlFor="farm_id" className="text-xs font-semibold">
            Select Farm Holding
          </Label>
          <select
            id="farm_id"
            value={farmId}
            onChange={(e) => setFarmId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.region})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* DOCUMENT UPLOAD DROPZONE */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          Upload Documentation (Required: 1 to 5 files)
        </Label>
        <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-input p-6 text-center hover:bg-muted/30 transition-colors">
          <UploadCloud className="size-8 text-muted-foreground mb-2" />
          <p className="text-xs font-medium text-foreground">
            Click to upload or drag and drop verification files
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ghana Card (front/back), Land Title, Site Plan, or Local Council clearance
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Accepted: PDF, PNG, JPEG, WEBP (Max 10MB per file)
          </p>

          <input
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={isPending}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* SELECTED FILES LIST */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-foreground">
              Attached Documents ({selectedFiles.length}/5):
            </p>
            <div className="space-y-1.5">
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span className="truncate font-medium text-foreground">{file.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-sm transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NOTES / REFERENCE FIELD */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs font-semibold">
          Identification Notes or Reference Details (Optional)
        </Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          placeholder="e.g. Ghana Card Number (GHA-XXXXXXXXX-X), District Extension Officer name, or Cooperative leader contact"
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
          disabled={isPending}
        />
        <p className="text-[11px] text-muted-foreground">
          Encrypted and accessible exclusively to authorized verification administrators.
        </p>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isPending || selectedFiles.length === 0} className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Uploading & Submitting...
            </>
          ) : (
            "Submit for Audit"
          )}
        </Button>
      </div>
    </form>
  );
}
