import type { Metadata } from "next";
import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { SiteHeader } from "@/components/shared/site-header";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Register as a farmer or buyer on Cropo.",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
          <SignupForm />
        </Suspense>
      </main>
    </div>
  );
}
