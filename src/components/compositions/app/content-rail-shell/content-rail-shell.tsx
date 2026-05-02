"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ContentRailShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  header?: React.ReactNode;
  rail?: React.ReactNode;
  railClassName?: string;
  reserveRail?: boolean;
}

export function ContentRailShell({
  children,
  className,
  contentClassName,
  header,
  rail,
  railClassName,
  reserveRail,
}: ContentRailShellProps) {
  const showRailColumn = reserveRail || rail;
  return (
    <section className={cn("mx-auto flex w-full min-w-0 max-w-[65.5rem] flex-col gap-5", className)}>
      {header ? <div className="min-w-0">{header}</div> : null}
      <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start">
        <div className={cn("min-w-0 xl:flex-1", contentClassName)}>{children}</div>
        {showRailColumn ? (
          <div className="min-w-0 xl:w-72 xl:shrink-0">
            {rail ? (
              <aside className={cn("hidden xl:block", railClassName)}>{rail}</aside>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
