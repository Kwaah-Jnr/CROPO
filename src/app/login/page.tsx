import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { SiteHeader } from "@/components/shared/site-header";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Cropo account.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
