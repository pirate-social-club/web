import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function CardShell({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-3xl)] border border-border-soft bg-card", className)}
      {...props}
    />
  );
}

export function PageContainer({
  className,
  size = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  size?: "default" | "narrow" | "wide";
}) {
  const sizeClassName = size === "wide"
    ? "max-w-[78rem]"
    : size === "narrow"
      ? "max-w-4xl"
      : "max-w-5xl";

  return (
    <div
      className={cn("mx-auto w-full", sizeClassName, className)}
      {...props}
    />
  );
}
