import * as React from "react";

import { cn } from "@/lib/utils";

export function SortControlRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;

  return (
    <div className={cn("flex justify-end", className)}>
      {children}
    </div>
  );
}
