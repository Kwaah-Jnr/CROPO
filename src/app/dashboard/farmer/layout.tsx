import { requireRole } from "@/lib/auth/session";

export default async function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("FARMER");
  return <>{children}</>;
}
