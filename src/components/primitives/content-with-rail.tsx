"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ContentWithRailProps {
  children: React.ReactNode;
  className?: string;
  rail?: React.ReactNode;
  railClassName?: string;
  railSticky?: boolean;
  railWidth?: string;
}

export function ContentWithRail({
  children,
  className,
  rail,
  railClassName,
  railSticky = false,
  railWidth = "20rem",
}: ContentWithRailProps) {
  if (!rail) {
    return (
      <div className={cn("min-w-0 flex-1", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("grid min-w-0 flex-1 gap-6", className)}
      style={{ gridTemplateColumns: `minmax(0,1fr) ${railWidth}` }}
    >
      <div className="min-w-0">
        {children}
      </div>
      <aside
        className={cn(
          "hidden xl:block",
          railSticky && "xl:sticky xl:top-6 xl:self-start",
          railClassName,
        )}
      >
        {rail}
      </aside>
    </div>
  );
}
