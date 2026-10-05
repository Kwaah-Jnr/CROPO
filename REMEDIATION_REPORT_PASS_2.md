# Cropo Remediation — Pass 2 Completion Report
## Fix Sign-Out Server Action / Authentication Flow

**Date:** 2026-10-05  
**Scope:** Pass 2 Remediation — Focus exclusively on the authentication and sign-out runtime failure  
**Status:** Complete, Verified, and Committed  
**Git Commit:** `6dbea65f9f84a941aec6c8d116e234f430fea188`  
**Commit Message:** `fix: repair server-side sign out flow`

---

## 1. Executive Summary

In Pass 2 of the remediation program, the sign-out flow was repaired to resolve the Next.js runtime error:
```
Runtime Error:
An unexpected response was received from the server.

Stack:
SignOutButton (src/components/shared/sign-out-button.tsx)
DashboardShell (src/components/dashboard/dashboard-shell.tsx)
DashboardLayout (src/app/dashboard/layout.tsx)
```

The underlying issue was an **import boundary & form submission mismatch in Next.js Server Actions**:
- `SignOutButton` was previously implemented as a Server Component without `"use client"`, rendering `<form action={signOut}>`.
- When hydrated in the browser, React submitted `multipart/form-data` with `Next-Action` header.
- In Next.js 16.3.8 (Turbopack), receiving `multipart/form-data` with `Next-Action` where the action performs cookie mutations (`Max-Age=0`) and throws `redirect("/login")` (`NEXT_REDIRECT`) prematurely aborted the response stream: `Error: Connection closed.` (digest `3300241546`), resulting in an HTTP 500 error chunk.
- React Flight client caught this error and surfaced: *"An unexpected response was received from the server."*

The fix converted `SignOutButton` to a `"use client"` component that intercepts submission with `startTransition(async () => { await signOut(); })` while retaining `<form action={signOut}>` for SSR/progressive enhancement compatibility. The Server Action `signOut()` in `src/actions/auth.ts` remains the authoritative server-side mechanism for cookie revocation and redirection.

All existing suites and a focused sign-out regression test suite passed with 0 failures, 0 TypeScript errors, 0 lint warnings, and a clean production build.

---

## 2. Root Cause Analysis

1. **Import Boundary Mismatch:**
   `SignOutButton` in `src/components/shared/sign-out-button.tsx` is an interactive UI control embedded in `DashboardShell` (Server Component) and `DashboardLayout` (Server Component). It was declared without `"use client"`.
2. **Form Action Hydration Behavior:**
   Because it was rendered as a Server Component with `<form action={signOut}>`, Next.js SSR rendered `<form action="" encType="multipart/form-data" method="POST"><input type="hidden" name="$ACTION_ID_..." />`. When hydrated on the client, React's form action handler intercepted button clicks and submitted a `POST` request with:
   - Header: `Next-Action: <hash>`
   - Header: `Accept: text/x-component`
   - Body: `FormData` (`multipart/form-data`)
3. **Stream Abort on Multipart Server Action:**
   In Next.js 16.3.8 under Turbopack, executing a Server Action with `multipart/form-data` that calls `@supabase/ssr` `setAll` cookie mutation followed by `redirect("/login")` throws an internal stream abort:
   ```
   ⨯ Error: Connection closed.
       at ignore-listed frames {
     digest: '3300241546'
   }
   POST /dashboard/farmer 500
   ```
4. **Error Boundary Trigger:**
   React Flight client received the 500 error response chunk (`1:E{"name":"Error","message":"Connection closed."}`) instead of the expected RSC redirect instruction, throwing:
   *"An unexpected response was received from the server."* with the component stack tracing to `SignOutButton`.

---

## 3. Implementation Details

### File Changed: `src/components/shared/sign-out-button.tsx`

The component was refactored into a client component adhering to Next.js best practices:

```tsx
"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <form action={signOut} onSubmit={handleSubmit} className={className}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={isPending}
        className={cn("w-full justify-start gap-2")}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut aria-hidden="true" />
        )}
        <span>{isPending ? "Signing out..." : "Sign out"}</span>
      </Button>
    </form>
  );
}
```

### Architectural Key Points:
* **Hybrid Compatibility:** `<form action={signOut}>` is retained on the form element. When JavaScript is disabled, native POST continues to trigger the server action (HTTP 303 redirect).
* **Flight RPC Handling:** When JavaScript is active, `handleSubmit` prevents native multipart submission and invokes `signOut()` via `startTransition()`. Next.js transmits this as a standard RPC call (`body: "[]"`), returning HTTP 200 with clean Flight navigation instructions.
* **Pending UI State:** The button displays a spinner and disables during transition, preventing duplicate clicks.

---

## 4. Authentication Behavior Matrix

| Step / State | Before Pass 2 | After Pass 2 |
|---|---|---|
| **Farmer Sign Out in Browser** | Crashed with *"An unexpected response was received from the server"* on dashboard. | Seamlessly transitions, displays "Signing out...", and redirects to `/login`. |
| **Buyer Sign Out in Browser** | Crashed with identical error boundary failure. | Seamlessly transitions and redirects to `/login`. |
| **Server-Side Session Revocation** | Broken by stream termination before response could be processed. | `supabase.auth.signOut({ scope: "local" })` deletes `sb-<project>-auth-token` with `Max-Age=0`. |
| **Direct URL Access Post-Signout** | Stale session or incomplete invalidation risk. | Direct navigation to `/dashboard/farmer` or `/dashboard/buyer` is rejected with HTTP 307 redirect to `/login`. |
| **Native Form Submission (JS Disabled)** | Supported via native POST. | Fully supported without regressions. |

---

## 5. Security & Architectural Compliance

* **Server-Side Sign-Out Integrity:** Sign-out continues to be executed solely on the server via `signOut()` Server Action in `src/actions/auth.ts`. No client-only authentication or client Supabase instance was introduced.
* **Route Protection Intact:** Route guarding via optimistic proxy gate (`src/proxy.ts`, `src/lib/supabase/proxy.ts`), server session validation (`requireProfile`, `requireRole` in `src/lib/auth/session.ts`), and action authorization (`authorize`) remain unmodified and fully enforced.
* **RLS & Role Enforcement:** Zero database policies or role checks were weakened.
* **Zero Sensitive Data Leaks:** Verified that neither access tokens, refresh tokens, credentials, nor session cookies are logged or leaked in responses.

---

## 6. Verification and Test Results

### Automated Quality Checks
* `npx tsc --noEmit`: **0 errors**
* `npm run lint`: **0 errors, 0 warnings**
* `npm run build`: **Compiled successfully in 4.9s, all 25 routes generated cleanly**

### Regression and Security Test Suites
1. **Sign-Out Regression Suite** (`scripts/verify-signout.ts`):
   * Test A (Farmer Sign-In $\rightarrow$ Dashboard $\rightarrow$ Sign Out $\rightarrow$ Cookie revoked $\rightarrow$ Navigated to `/login`): **Passed**
   * Test B (Buyer Sign-In $\rightarrow$ Dashboard $\rightarrow$ Native Form Sign Out $\rightarrow$ Cookie revoked $\rightarrow$ Redirect to `/login`): **Passed**
   * Test C (Unauthenticated direct access to `/dashboard/farmer` rejected): **Passed (HTTP 307 $\rightarrow$ `/login`)**
   * Test D (Unauthenticated direct access to `/dashboard/buyer` rejected): **Passed (HTTP 307 $\rightarrow$ `/login`)**
   * Test E (No access token or refresh token leaked in responses): **Passed**
   * **Result: 20 passed, 0 failed**

2. **Phase 2 Foundation Suite** (`scripts/verify-foundation.ts`):
   * Roles & route mappings, open-redirect protection, auth validation, migration RLS:
   * **Result: 22 passed, 0 failed**

3. **Phase 3 Regression Suite** (`scripts/verify-phase3.ts`):
   * Anonymous marketplace access, filter params, listing fallback, public farmer profile privacy, table RLS denials:
   * **Result: 37 passed, 0 failed**

4. **Phase 4 Regression Suite** (`scripts/verify-phase4.ts`):
   * Farmer listing validation, farm holdings schema, negative RLS/image permissions, farmer verification privacy:
   * **Result: 28 passed, 0 failed**

5. **Phase 5 Regression Suite** (`scripts/verify-phase5.ts`):
   * Buyer action schemas, 11-state order machine, anonymous access denials, atomic RPC protection:
   * **Result: 29 passed, 0 failed**

6. **Farmer Offers Regression Suite** (`scripts/verify-farmer-offers-regression.ts`):
   * Honest empty state, offer queries, cross-farmer RLS isolation, buyer private data protection:
   * **Result: 18 passed, 0 failed**

7. **Pass 1 Security Suite (H3 & H4)** (`scripts/verify-pass1-security.ts`):
   * Field immutability, direct quote/offer ACCEPTED status bypass denial, competing quote cancellation, stock validation:
   * **Result: 30 passed, 0 failed**

---

## 7. Git Commit Hash

```
6dbea65f9f84a941aec6c8d116e234f430fea188
```
Commit message: `fix: repair server-side sign out flow`
