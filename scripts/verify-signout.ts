import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    testsFailed++;
  }
}

async function verifySignOutSuite() {
  console.log("\n=======================================================");
  console.log(" CROPO — SIGN OUT SERVER ACTION & AUTH VERIFICATION");
  console.log("=======================================================\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  if (!url || !anonKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // -------------------------------------------------------------------------
  // TEST A: Sign in as FARMER -> dashboard loads -> click Sign out -> redirected to /login
  // -------------------------------------------------------------------------
  console.log("[A] Testing FARMER Sign Out flow...");

  const farmerEmail = `farmer_test_${Date.now()}@cropo.test`;
  const password = "Password123!";

  const { data: farmerAuth, error: farmerErr } = await anonClient.auth.signUp({
    email: farmerEmail,
    password,
    options: {
      data: { role: "FARMER", full_name: "Test SignOut Farmer" },
    },
  });

  assert(!farmerErr && !!farmerAuth.session, "Farmer account created and session obtained");

  const farmerCookie = `${cookieName}=${encodeURIComponent(JSON.stringify(farmerAuth.session))}`;

  // 1. Load Farmer Dashboard
  const farmerDashRes = await fetch("http://localhost:3000/dashboard/farmer", {
    headers: { Cookie: farmerCookie },
    redirect: "manual",
  });
  assert(farmerDashRes.status === 200, "Farmer dashboard loads successfully (HTTP 200)");

  const farmerHtml = await farmerDashRes.text();
  assert(farmerHtml.includes("Sign out"), "Farmer dashboard contains 'Sign out' button");

  // Extract action ID
  const actionMatch = farmerHtml.match(/name="\$ACTION_ID_([^"]+)"/);
  const actionId = actionMatch?.[1];
  assert(!!actionId, "Extracted valid Server Action ID for signOut");

  // 2. Execute Sign Out via Client Server Action (Next-Action header)
  const clientActionRes = await fetch("http://localhost:3000/dashboard/farmer", {
    method: "POST",
    headers: {
      Cookie: farmerCookie,
      "Next-Action": actionId!,
      Accept: "text/x-component",
      Origin: "http://localhost:3000",
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify([]),
    redirect: "manual",
  });

  assert(
    clientActionRes.status === 200,
    "SignOut Server Action succeeds via Flight protocol (HTTP 200)",
    `Received status ${clientActionRes.status}`
  );

  const clientActionText = await clientActionRes.text();
  assert(
    clientActionText.includes("login") || clientActionText.includes("Sign In"),
    "SignOut action flight response navigates/redirects to /login"
  );

  // Check Set-Cookie headers for cookie revocation
  const setCookieHeaders = clientActionRes.headers.get("set-cookie") || "";
  assert(
    setCookieHeaders.includes("Max-Age=0") || setCookieHeaders.includes("expires="),
    "Auth session cookie cleared by Server Action (Max-Age=0)"
  );

  // 3. Directly visiting /dashboard/farmer after sign out is rejected
  console.log("\n[C] Verifying /dashboard/farmer is rejected without active session...");
  const revokedCookie = `${cookieName}=`;
  const rejectedFarmerRes = await fetch("http://localhost:3000/dashboard/farmer", {
    headers: { Cookie: revokedCookie },
    redirect: "manual",
  });

  assert(
    rejectedFarmerRes.status === 307 || rejectedFarmerRes.status === 302 || rejectedFarmerRes.status === 303,
    "Unauthenticated request to /dashboard/farmer is redirected"
  );
  const farmerRedirectLoc = rejectedFarmerRes.headers.get("location") || "";
  assert(
    farmerRedirectLoc.startsWith("/login"),
    "Redirect location targets /login",
    farmerRedirectLoc
  );

  // -------------------------------------------------------------------------
  // TEST B: Sign in as BUYER -> dashboard loads -> click Sign out -> redirected to /login
  // -------------------------------------------------------------------------
  console.log("\n[B] Testing BUYER Sign Out flow...");

  const buyerEmail = `buyer_test_${Date.now()}@cropo.test`;
  const { data: buyerAuth, error: buyerErr } = await anonClient.auth.signUp({
    email: buyerEmail,
    password,
    options: {
      data: { role: "BUYER", full_name: "Test SignOut Buyer" },
    },
  });

  assert(!buyerErr && !!buyerAuth.session, "Buyer account created and session obtained");

  const buyerCookie = `${cookieName}=${encodeURIComponent(JSON.stringify(buyerAuth.session))}`;

  // 1. Load Buyer Dashboard
  const buyerDashRes = await fetch("http://localhost:3000/dashboard/buyer", {
    headers: { Cookie: buyerCookie },
    redirect: "manual",
  });
  assert(buyerDashRes.status === 200, "Buyer dashboard loads successfully (HTTP 200)");

  const buyerHtml = await buyerDashRes.text();
  assert(buyerHtml.includes("Sign out"), "Buyer dashboard contains 'Sign out' button");

  const buyerActionMatch = buyerHtml.match(/name="\$ACTION_ID_([^"]+)"/);
  const buyerActionId = buyerActionMatch?.[1];
  assert(!!buyerActionId, "Extracted valid Server Action ID for signOut on Buyer dashboard");

  // 2. Execute Sign Out via Native Form POST (progressive enhancement)
  const nativeFormData = new FormData();
  nativeFormData.append(`$ACTION_ID_${buyerActionId!}`, "");

  const buyerSignOutRes = await fetch("http://localhost:3000/dashboard/buyer", {
    method: "POST",
    headers: {
      Cookie: buyerCookie,
      Origin: "http://localhost:3000",
    },
    body: nativeFormData,
    redirect: "manual",
  });

  assert(
    buyerSignOutRes.status === 303 || buyerSignOutRes.status === 307,
    "Native SignOut form submission redirects with HTTP 303/307"
  );
  assert(
    buyerSignOutRes.headers.get("location") === "/login",
    "Redirect location is /login"
  );
  const buyerSetCookie = buyerSignOutRes.headers.get("set-cookie") || "";
  assert(
    buyerSetCookie.includes("Max-Age=0") || buyerSetCookie.includes("expires="),
    "Buyer auth cookie cleared on sign out (Max-Age=0)"
  );

  // -------------------------------------------------------------------------
  // TEST D: After sign out, directly visiting /dashboard/buyer is rejected
  // -------------------------------------------------------------------------
  console.log("\n[D] Verifying /dashboard/buyer is rejected without active session...");
  const rejectedBuyerRes = await fetch("http://localhost:3000/dashboard/buyer", {
    headers: { Cookie: revokedCookie },
    redirect: "manual",
  });

  assert(
    rejectedBuyerRes.status === 307 || rejectedBuyerRes.status === 302 || rejectedBuyerRes.status === 303,
    "Unauthenticated request to /dashboard/buyer is redirected"
  );
  const buyerRedirectLoc = rejectedBuyerRes.headers.get("location") || "";
  assert(
    buyerRedirectLoc.startsWith("/login"),
    "Redirect location targets /login",
    buyerRedirectLoc
  );

  // -------------------------------------------------------------------------
  // TEST E: No auth tokens or sensitive data in headers / logs
  // -------------------------------------------------------------------------
  console.log("\n[E] Verifying no sensitive tokens leaked in responses...");
  assert(
    !clientActionText.includes(farmerAuth.session!.access_token),
    "Access token is not exposed in Server Action flight response"
  );
  assert(
    !clientActionText.includes(farmerAuth.session!.refresh_token),
    "Refresh token is not exposed in Server Action flight response"
  );

  console.log("\n=======================================================");
  console.log(` SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("=======================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

verifySignOutSuite().catch((err) => {
  console.error("Verification script error:", err);
  process.exit(1);
});
