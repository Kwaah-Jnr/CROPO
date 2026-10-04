import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function FormMessage({
  variant,
  children,
  className,
}: {
  variant: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = variant === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-success/30 bg-success/5 text-success",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {messages[0]}
    </p>
  );
}
