import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

type TestActor = {
  id: string;
  email: string;
  client: SupabaseClient;
  token: string;
};

async function createActor(role: "FARMER" | "BUYER", name: string): Promise<TestActor> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const email = `pass4_${role.toLowerCase()}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}@cropo.test`;
  const password = "Pass4TestPassword123!";

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: name,
      },
    },
  });

  if (error || !data.user || !data.session) {
    throw new Error(`Failed to create actor ${name}: ${error?.message}`);
  }

  const authedClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  });

  return {
    id: data.user.id,
    email,
    client: authedClient,
    token: data.session.access_token,
  };
}

async function runPass4VerificationSuite() {
  console.log("\n========================================================================");
  console.log(" CROPO PASS 4 — COMPLETE FARMER VERIFICATION WORKFLOW TEST SUITE (M2)");
  console.log("========================================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const serviceClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  console.log("1. Setting up test actors (Farmer 1, Farmer 2, Admin)...");
  const farmer1 = await createActor("FARMER", "Kofi Mensah");
  const farmer2 = await createActor("FARMER", "Kwame Addo");
  const adminActor = await createActor("BUYER", "Cropo Admin Reviewer");

  // Promote adminActor to ADMIN role using trusted backend service client
  const { error: promoteError } = await serviceClient
    .from("profiles")
    .update({ role: "ADMIN" })
    .eq("id", adminActor.id);

  if (promoteError) {
    console.error("Failed to promote admin actor:", promoteError.message);
    process.exit(1);
  }

  // Create a farm holding for Farmer 1 and Farmer 2
  const { data: farm1, error: farm1Error } = await farmer1.client
    .from("farms")
    .insert({
      farmer_id: farmer1.id,
      name: "Kofi Palm & Cassava Farm",
      region: "Ashanti",
      size_hectares: 12.5,
    })
    .select("id")
    .single();

  const { data: farm2, error: farm2Error } = await farmer2.client
    .from("farms")
    .insert({
      farmer_id: farmer2.id,
      name: "Kwame Volta Vegetables",
      region: "Volta",
      size_hectares: 8.0,
    })
    .select("id")
    .single();

  if (farm1Error || !farm1 || farm2Error || !farm2) {
    console.error("Failed to create test farms:", farm1Error || farm2Error);
    process.exit(1);
  }

  const uploadedDocPaths: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: ANONYMOUS ACCESS RESTRICTIONS
    // -------------------------------------------------------------------------
    console.log("\n2. Testing Anonymous Access Restrictions...");

    const { data: anonReadData, error: anonReadError } = await anonClient
      .from("verification_submissions")
      .select("*");
    assert(
      !anonReadData || anonReadData.length === 0 || !!anonReadError,
      "Anonymous users cannot select from 'verification_submissions'",
      anonReadError?.message
    );

    const { error: anonInsertError } = await anonClient
      .from("verification_submissions")
      .insert({
        profile_id: farmer1.id,
        type: "FARMER_IDENTITY",
        document_paths: ["anon/id.pdf"],
        status: "PENDING",
      });
    assert(
      !!anonInsertError,
      "Anonymous users cannot insert into 'verification_submissions'",
      anonInsertError?.message
    );

    const testFileBuffer = Buffer.from("Test PDF content representing Ghana Card");
    const { error: anonStorageError } = await anonClient.storage
      .from("verification-documents")
      .upload("anon_test.pdf", testFileBuffer);
    assert(
      !!anonStorageError,
      "Anonymous users cannot upload to 'verification-documents' bucket",
      anonStorageError?.message
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 2: FARMER CANNOT SELF-VERIFY (guard_verification_fields)
    // -------------------------------------------------------------------------
    console.log("\n3. Testing Anti-Self-Verification Protections...");

    // Farmer 1 attempts to set own profile to VERIFIED
    const { error: selfVerifyError } = await farmer1.client
      .from("farmer_profiles")
      .update({ verification_status: "VERIFIED" })
      .eq("profile_id", farmer1.id);
    assert(
      !!selfVerifyError && (selfVerifyError.code === "42501" || selfVerifyError.message.includes("administrator")),
      "Farmer cannot directly update own profile to 'VERIFIED' (blocked with 42501)",
      selfVerifyError?.message
    );

    // Farmer 1 attempts to set own profile to PENDING directly
    const { error: selfPendingError } = await farmer1.client
      .from("farmer_profiles")
      .update({ verification_status: "PENDING" })
      .eq("profile_id", farmer1.id);
    assert(
      !!selfPendingError && (selfPendingError.code === "42501" || selfPendingError.message.includes("administrator")),
      "Farmer cannot directly update own profile to 'PENDING' (blocked with 42501)",
      selfPendingError?.message
    );

    // Farmer 1 attempts to self-verify own farm
    const { error: farmSelfVerifyError } = await farmer1.client
      .from("farms")
      .update({ verification_status: "VERIFIED" })
      .eq("id", farm1.id);
    assert(
      !!farmSelfVerifyError && (farmSelfVerifyError.code === "42501" || farmSelfVerifyError.message.includes("administrator")),
      "Farmer cannot directly update own farm to 'VERIFIED' (blocked with 42501)",
      farmSelfVerifyError?.message
    );

    // Farmer 1 attempts to alter verified_by
    const { error: verifiedByError } = await farmer1.client
      .from("farmer_profiles")
      .update({ verified_by: farmer1.id })
      .eq("profile_id", farmer1.id);
    assert(
      !!verifiedByError && (verifiedByError.code === "42501" || verifiedByError.message.includes("administrator")),
      "Farmer cannot directly set 'verified_by' column (blocked with 42501)",
      verifiedByError?.message
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 3: STORAGE FOLDER OWNERSHIP & PRIVACY
    // -------------------------------------------------------------------------
    console.log("\n4. Testing Storage Folder Ownership & Privacy...");

    const docPathFarmer1 = `${farmer1.id}/ghana_card_${Date.now()}.pdf`;
    const { error: uploadF1Error } = await farmer1.client.storage
      .from("verification-documents")
      .upload(docPathFarmer1, testFileBuffer, { contentType: "application/pdf" });
    assert(!uploadF1Error, "Farmer 1 can upload document into own storage folder", uploadF1Error?.message);
    if (!uploadF1Error) uploadedDocPaths.push(docPathFarmer1);

    // Farmer 1 attempts to upload into Farmer 2's folder
    const illegalPath = `${farmer2.id}/illegal_upload.pdf`;
    const { error: illegalUploadError } = await farmer1.client.storage
      .from("verification-documents")
      .upload(illegalPath, testFileBuffer, { contentType: "application/pdf" });
    assert(
      !!illegalUploadError,
      "Farmer 1 cannot upload into Farmer 2's storage folder",
      illegalUploadError?.message
    );

    // Farmer 2 attempts to read Farmer 1's private document directly
    const { error: f2DownloadError } = await farmer2.client.storage
      .from("verification-documents")
      .download(docPathFarmer1);
    assert(
      !!f2DownloadError,
      "Farmer 2 cannot read/download Farmer 1's private verification document",
      f2DownloadError?.message
    );

    // Farmer 1 can create signed URL for own document
    const { data: signedUrlData, error: signedUrlError } = await farmer1.client.storage
      .from("verification-documents")
      .createSignedUrl(docPathFarmer1, 300);
    assert(
      !signedUrlError && !!signedUrlData?.signedUrl,
      "Farmer 1 can generate signed URL for own verification document",
      signedUrlError?.message
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 4: CROSS-FARMER SUBMISSION ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log("\n5. Testing Cross-Farmer Submission Enforcement...");

    // Farmer 1 attempts to submit on behalf of Farmer 2
    const { error: impersonateProfileError } = await farmer1.client
      .from("verification_submissions")
      .insert({
        profile_id: farmer2.id,
        type: "FARMER_IDENTITY",
        document_paths: [docPathFarmer1],
        status: "PENDING",
      });
    assert(
      !!impersonateProfileError,
      "Farmer 1 cannot submit verification for Farmer 2's profile (RLS check)",
      impersonateProfileError?.message
    );

    // Farmer 1 attempts to submit for Farmer 2's farm
    const { error: impersonateFarmError } = await farmer1.client
      .from("verification_submissions")
      .insert({
        profile_id: farmer1.id,
        farm_id: farm2.id,
        type: "FARM",
        document_paths: [docPathFarmer1],
        status: "PENDING",
      });
    assert(
      !!impersonateFarmError,
      "Farmer 1 cannot submit verification for a farm owned by Farmer 2 (RLS check)",
      impersonateFarmError?.message
    );

    // Farmer 1 attempts to reference a document from Farmer 2's folder
    const { error: impersonateDocError } = await farmer1.client
      .from("verification_submissions")
      .insert({
        profile_id: farmer1.id,
        type: "FARMER_IDENTITY",
        document_paths: [`${farmer2.id}/stolen_doc.pdf`],
        status: "PENDING",
      });
    assert(
      !!impersonateDocError,
      "Farmer 1 cannot reference documents outside own storage folder (RLS check)",
      impersonateDocError?.message
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 5: LEGITIMATE SUBMISSION & AUTOMATIC PENDING TRANSITION
    // -------------------------------------------------------------------------
    console.log("\n6. Testing Farmer Verification Submission & Status Transitions...");

    // Initial state check
    const { data: initialProfile } = await farmer1.client
      .from("farmer_profiles")
      .select("verification_status")
      .eq("profile_id", farmer1.id)
      .single();
    assert(
      initialProfile?.verification_status === "UNVERIFIED",
      "Farmer 1 starts in 'UNVERIFIED' standing"
    );

    // Submission without documents is rejected by constraint
    const { error: emptyDocsError } = await farmer1.client
      .from("verification_submissions")
      .insert({
        profile_id: farmer1.id,
        type: "FARMER_IDENTITY",
        document_paths: [],
        status: "PENDING",
      });
    assert(
      !!emptyDocsError,
      "Submission with empty document_paths is rejected by database constraint",
      emptyDocsError?.message
    );

    // Legitimate submission with valid document
    const { data: sub1, error: sub1Error } = await farmer1.client
      .from("verification_submissions")
      .insert({
        profile_id: farmer1.id,
        type: "FARMER_IDENTITY",
        document_paths: [docPathFarmer1],
        notes: "GHA-726194018-2",
        status: "PENDING",
      })
      .select("id, status")
      .single();
    assert(
      !sub1Error && !!sub1,
      "Farmer 1 can submit legitimate verification with document",
      sub1Error?.message
    );

    // Check that farmer_profiles.verification_status automatically transitioned to PENDING
    const { data: pendingProfile } = await farmer1.client
      .from("farmer_profiles")
      .select("verification_status")
      .eq("profile_id", farmer1.id)
      .single();
    assert(
      pendingProfile?.verification_status === "PENDING",
      "Farmer 1 profile automatically transitioned to 'PENDING' via database sync trigger"
    );

    // Duplicate pending submission is rejected
    const { error: dupPendingError } = await farmer1.client
      .from("verification_submissions")
      .insert({
        profile_id: farmer1.id,
        type: "FARMER_IDENTITY",
        document_paths: [docPathFarmer1],
        status: "PENDING",
      });
    assert(
      !!dupPendingError && dupPendingError.code === "23505",
      "Duplicate pending submission for same profile is rejected with unique constraint (23505)",
      dupPendingError?.message
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 6: ADMIN REVIEW WORKFLOW & ARCHITECTURE
    // -------------------------------------------------------------------------
    console.log("\n7. Testing Admin Review Workflow & State Transitions...");

    // Farmer 2 attempts to call admin review RPC
    const { error: farmerCallAdminRpcError } = await farmer2.client.rpc(
      "admin_review_verification_submission",
      {
        p_submission_id: sub1!.id,
        p_status: "APPROVED",
        p_review_notes: "Malicious farmer approval",
      }
    );
    assert(
      !!farmerCallAdminRpcError && (farmerCallAdminRpcError.code === "42501" || farmerCallAdminRpcError.message.includes("administrator")),
      "Non-admin farmer cannot invoke 'admin_review_verification_submission' RPC (blocked with 42501)",
      farmerCallAdminRpcError?.message
    );

    // Farmer 1 attempts direct update on verification_submissions
    const { data: attemptedUpdate } = await farmer1.client
      .from("verification_submissions")
      .update({ status: "APPROVED" })
      .eq("id", sub1!.id)
      .select();

    const { data: currentSub } = await farmer1.client
      .from("verification_submissions")
      .select("status")
      .eq("id", sub1!.id)
      .single();

    assert(
      (!attemptedUpdate || attemptedUpdate.length === 0) && currentSub?.status === "PENDING",
      "Farmer cannot directly update status in 'verification_submissions' (RLS blocks mutation; remains PENDING)"
    );


    // Admin reviews and REJECTS submission
    const { data: rejectResult, error: adminRejectError } = await adminActor.client.rpc(
      "admin_review_verification_submission",
      {
        p_submission_id: sub1!.id,
        p_status: "REJECTED",
        p_review_notes: "Ghana Card photo is blurry, please provide a clear high-res scan.",
      }
    );
    assert(
      !adminRejectError && !!rejectResult,
      "Admin can review and reject verification submission via RPC",
      adminRejectError?.message
    );

    // Check submission status and reviewer stamping
    const { data: rejectedSub } = await farmer1.client
      .from("verification_submissions")
      .select("status, reviewer_id, review_notes, reviewed_at")
      .eq("id", sub1!.id)
      .single();
    assert(
      rejectedSub?.status === "REJECTED" &&
        rejectedSub?.reviewer_id === adminActor.id &&
        !!rejectedSub?.reviewed_at &&
        rejectedSub?.review_notes?.includes("blurry"),
      "Submission recorded as REJECTED with admin reviewer stamped and feedback preserved"
    );

    // Check that farmer_profiles.verification_status automatically transitioned to REJECTED
    const { data: rejectedProfile } = await farmer1.client
      .from("farmer_profiles")
      .select("verification_status")
      .eq("profile_id", farmer1.id)
      .single();
    assert(
      rejectedProfile?.verification_status === "REJECTED",
      "Farmer 1 profile automatically transitioned to 'REJECTED' via sync trigger"
    );

    // Farmer 1 resubmits after rejection (allowed because previous is not PENDING)
    const docPathFarmer1V2 = `${farmer1.id}/ghana_card_v2_${Date.now()}.pdf`;
    await farmer1.client.storage
      .from("verification-documents")
      .upload(docPathFarmer1V2, testFileBuffer, { contentType: "application/pdf" });
    uploadedDocPaths.push(docPathFarmer1V2);

    const { data: sub2, error: sub2Error } = await farmer1.client
      .from("verification_submissions")
      .insert({
        profile_id: farmer1.id,
        type: "FARMER_IDENTITY",
        document_paths: [docPathFarmer1V2],
        notes: "Clear high-resolution scan re-uploaded.",
        status: "PENDING",
      })
      .select("id, status")
      .single();
    assert(
      !sub2Error && !!sub2,
      "Farmer 1 can resubmit after previous rejection",
      sub2Error?.message
    );

    // Check transition back to PENDING
    const { data: pendingProfileV2 } = await farmer1.client
      .from("farmer_profiles")
      .select("verification_status")
      .eq("profile_id", farmer1.id)
      .single();
    assert(
      pendingProfileV2?.verification_status === "PENDING",
      "Farmer 1 profile transitioned from 'REJECTED' back to 'PENDING'"
    );

    // Admin reviews and APPROVES submission
    const { data: approveResult, error: adminApproveError } = await adminActor.client.rpc(
      "admin_review_verification_submission",
      {
        p_submission_id: sub2!.id,
        p_status: "APPROVED",
        p_review_notes: "Ghana Card confirmed with national registry. Approved.",
      }
    );
    assert(
      !adminApproveError && !!approveResult,
      "Admin can review and approve verification submission via RPC",
      adminApproveError?.message
    );

    // Check that farmer_profiles.verification_status automatically transitioned to VERIFIED
    const { data: verifiedProfile } = await farmer1.client
      .from("farmer_profiles")
      .select("verification_status, verified_by, verified_at")
      .eq("profile_id", farmer1.id)
      .single();
    assert(
      verifiedProfile?.verification_status === "VERIFIED" &&
        verifiedProfile?.verified_by === adminActor.id &&
        !!verifiedProfile?.verified_at,
      "Farmer 1 profile automatically transitioned to 'VERIFIED' with verified_by and verified_at populated"
    );

    // Public view exposes VERIFIED status without exposing sensitive documents or notes
    const { data: publicProfile, error: publicProfileError } = await anonClient
      .from("public_farmer_profiles")
      .select("id, full_name, verification_status")
      .eq("id", farmer1.id)
      .single();
    assert(
      !publicProfileError && publicProfile?.verification_status === "VERIFIED",
      "Public profile correctly displays 'VERIFIED' badge without exposing private credentials",
      publicProfileError?.message
    );
  } finally {
    // -------------------------------------------------------------------------
    // TEST SECTION 7: CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n8. Cleaning up test artifacts...");
    try {
      if (uploadedDocPaths.length > 0) {
        await serviceClient.storage.from("verification-documents").remove(uploadedDocPaths);
      }
      await serviceClient.from("verification_submissions").delete().eq("profile_id", farmer1.id);
      await serviceClient.from("verification_submissions").delete().eq("profile_id", farmer2.id);
      await serviceClient.from("farms").delete().eq("id", farm1.id);
      await serviceClient.from("farms").delete().eq("id", farm2.id);
      await serviceClient.from("farmer_profiles").delete().eq("profile_id", farmer1.id);
      await serviceClient.from("farmer_profiles").delete().eq("profile_id", farmer2.id);
      await serviceClient.from("profiles").delete().eq("id", farmer1.id);
      await serviceClient.from("profiles").delete().eq("id", farmer2.id);
      await serviceClient.from("profiles").delete().eq("id", adminActor.id);
      await serviceClient.auth.admin.deleteUser(farmer1.id);
      await serviceClient.auth.admin.deleteUser(farmer2.id);
      await serviceClient.auth.admin.deleteUser(adminActor.id);
      console.log("  ✓ Test artifacts cleaned up successfully");
    } catch (cleanupErr) {
      console.warn("  ! Note: Non-critical error during cleanup:", cleanupErr);
    }
  }

  console.log("\n========================================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPass4VerificationSuite().catch((err) => {
  console.error("Unhandled error in Pass 4 test suite:", err);
  process.exit(1);
});
