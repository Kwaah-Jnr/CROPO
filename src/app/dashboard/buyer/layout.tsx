import { requireRole } from "@/lib/auth/session";

export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("BUYER");
  return <>{children}</>;
}
