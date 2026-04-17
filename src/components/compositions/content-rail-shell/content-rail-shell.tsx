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
}

export function ContentRailShell({
  children,
  className,
  contentClassName,
  header,
  rail,
  railClassName,
}: ContentRailShellProps) {
  return (
    <section className={cn("mx-auto flex w-full min-w-0 max-w-[72rem] flex-col gap-5", className)}>
      {header ? <div className="min-w-0">{header}</div> : null}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={cn("min-w-0", contentClassName)}>{children}</div>
        {rail ? (
          <>
            <aside className={cn("hidden xl:block", railClassName)}>{rail}</aside>
            <div className="xl:hidden">{rail}</div>
          </>
        ) : null}
      </div>
    </section>
  );
}
