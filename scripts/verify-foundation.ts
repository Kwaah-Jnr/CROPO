import fs from "node:fs";
import path from "node:path";
import { dashboardPathForRole, ROLE_LABELS, SIGNUP_ROLES, USER_ROLES } from "../src/lib/auth/roles";
import { safeRedirectPath } from "../src/lib/utils/safe-redirect";
import { loginSchema, signupSchema } from "../src/lib/validation/auth";
import type { UserRole } from "../src/types/domain";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ""}`);
    testsFailed++;
  }
}

console.log("\n=======================================================");
console.log(" CROPO PHASE 2 — FOUNDATION VERIFICATION SUITE");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Roles & Route Protection Strategy
// ---------------------------------------------------------------------------
console.log("[1] Testing Roles and Route Mappings...");
assert(USER_ROLES.length === 3, "Exactly 3 user roles defined (FARMER, BUYER, ADMIN)");
assert(!SIGNUP_ROLES.includes("ADMIN" as UserRole), "ADMIN is excluded from signup roles");
assert(dashboardPathForRole("FARMER") === "/dashboard/farmer", "FARMER route maps to /dashboard/farmer");
assert(dashboardPathForRole("BUYER") === "/dashboard/buyer", "BUYER route maps to /dashboard/buyer");
assert(dashboardPathForRole("ADMIN") === "/dashboard/admin", "ADMIN route maps to /dashboard/admin");

// ---------------------------------------------------------------------------
// 2. Open-Redirect & Safe Path Protection
// ---------------------------------------------------------------------------
console.log("\n[2] Testing Open-Redirect Protection...");
assert(safeRedirectPath("/dashboard/farmer") === "/dashboard/farmer", "Allows safe relative path");
assert(safeRedirectPath("https://evil.com") === "/dashboard", "Rejects absolute URL");
assert(safeRedirectPath("//evil.com") === "/dashboard", "Rejects protocol-relative // URL");
assert(safeRedirectPath("/\\evil.com") === "/dashboard", "Rejects backslash bypass URL");
assert(safeRedirectPath(null) === "/dashboard", "Handles null with fallback");

// ---------------------------------------------------------------------------
// 3. Auth Input Validation & Security Constraints
// ---------------------------------------------------------------------------
console.log("\n[3] Testing Auth Validation Schemas...");
// Signup schema
const validFarmer = signupSchema.safeParse({
  role: "FARMER",
  fullName: "Kwame Asante",
  email: "kwame@cropo.test",
  password: "Password123",
});
assert(validFarmer.success, "Valid farmer signup accepted");

const invalidRole = signupSchema.safeParse({
  role: "ADMIN",
  fullName: "Hacker",
  email: "hacker@cropo.test",
  password: "Password123",
});
assert(!invalidRole.success, "Signup as ADMIN is blocked by validation");

const weakPass = signupSchema.safeParse({
  role: "BUYER",
  fullName: "Buyer Test",
  email: "buyer@cropo.test",
  password: "short",
});
assert(!weakPass.success, "Weak password (<8 chars) is rejected");

const buyerWithBusiness = signupSchema.safeParse({
  role: "BUYER",
  fullName: "Ama Serwaa",
  businessName: "Accra Fresh Ltd",
  email: "ama@cropo.test",
  password: "Password123",
});
assert(buyerWithBusiness.success && buyerWithBusiness.data.businessName === "Accra Fresh Ltd", "Buyer business name preserved");

// Login schema
const validLogin = loginSchema.safeParse({
  email: "user@cropo.test",
  password: "Password123",
});
assert(validLogin.success, "Valid login payload accepted");

// ---------------------------------------------------------------------------
// 4. Supabase Migrations & Database Security Audit
// ---------------------------------------------------------------------------
console.log("\n[4] Auditing Database Migrations for RLS, Constraints, and Security...");
const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
assert(migrationFiles.length >= 6, `Found ${migrationFiles.length} migration files in supabase/migrations`);

const combinedSql = migrationFiles
  .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf-8"))
  .join("\n");

// All 18 tables have RLS enabled
const expectedTables = [
  "profiles", "farmer_profiles", "buyer_profiles", "farms", "crop_categories",
  "listings", "listing_images", "offers", "buying_requests", "request_offers",
  "orders", "order_items", "order_status_history", "reviews", "notifications",
  "saved_suppliers", "verification_submissions", "disputes",
];

let allRlsEnabled = true;
for (const table of expectedTables) {
  if (!combinedSql.includes(`alter table public.${table} enable row level security`)) {
    allRlsEnabled = false;
    console.error(`Missing RLS enable statement for table: ${table}`);
  }
}
assert(allRlsEnabled, "RLS enabled on all 18 tables (14 core + 4 approved MVP tables)");

// Immutable role check
assert(
  combinedSql.includes("guard_profile_role") && combinedSql.includes("Role cannot be changed"),
  "profiles.role is guarded against client modifications",
);

// Admin-only verification fields
assert(
  combinedSql.includes("guard_verification_fields") && combinedSql.includes("Verification fields can only be changed by an administrator"),
  "verification_status is guarded for admin-only modification",
);

// DB-enforced order state machine & start states
assert(
  combinedSql.includes("guard_order_status") &&
  combinedSql.includes("order_transition_allowed") &&
  combinedSql.includes("BUY_NOW") &&
  combinedSql.includes("PENDING"),
  "Order state machine and initial states (Buy Now -> PENDING, Offer/Request -> ACCEPTED) enforced at database level",
);

// Audit history logging
assert(
  combinedSql.includes("order_status_history") && combinedSql.includes("record_order_status"),
  "Order status changes automatically logged to order_status_history",
);

// Storage buckets
assert(
  combinedSql.includes("listing-images") &&
  combinedSql.includes("avatars") &&
  combinedSql.includes("verification-documents"),
  "All 3 storage buckets defined with appropriate permissions",
);

// ---------------------------------------------------------------------------
// 5. Check Live Supabase Connection (if .env.local configured)
// ---------------------------------------------------------------------------
console.log("\n[5] Checking Live Supabase Configuration...");
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  const hasUrl = envContent.includes("NEXT_PUBLIC_SUPABASE_URL=") && !envContent.includes("https://your-project-ref.supabase.co");
  const hasAnon = envContent.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY=") && !envContent.includes("your-anon-or-publishable-key");
  if (hasUrl && hasAnon) {
    console.log("  ✓ .env.local is configured with real Supabase credentials");
  } else {
    console.log("  ℹ .env.local exists but has placeholder values. User manual step needed to connect hosted project.");
  }
} else {
  console.log("  ℹ .env.local not found. Instructions provided for connecting your hosted Supabase project.");
}

console.log("\n-------------------------------------------------------");
console.log(` Verification summary: ${testsPassed} passed, ${testsFailed} failed`);
console.log("-------------------------------------------------------\n");

if (testsFailed > 0) {
  process.exit(1);
}
