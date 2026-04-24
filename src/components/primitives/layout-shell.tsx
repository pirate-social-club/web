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
  size?: "default" | "feed" | "narrow" | "rail" | "wide";
}) {
  const sizeClassName = {
    default: "max-w-5xl",
    feed: "max-w-[46rem]",
    narrow: "max-w-4xl",
    rail: "max-w-[65.5rem]",
    wide: "max-w-7xl",
  }[size];

  return (
    <div
      className={cn("mx-auto w-full", sizeClassName, className)}
      {...props}
    />
  );
}
