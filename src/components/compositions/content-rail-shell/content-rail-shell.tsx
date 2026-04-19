"use client";

import * as React from "react";

import { useUiLocale } from "@/lib/ui-locale";
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
  const { isRtl } = useUiLocale();

  return (
    <section className={cn("mx-auto flex w-full min-w-0 max-w-[78rem] flex-col gap-5", className)}>
      {header ? <div className="min-w-0">{header}</div> : null}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-6 xl:items-start",
          isRtl ? "xl:flex-row-reverse" : "xl:flex-row",
        )}
      >
        <div className={cn("min-w-0 xl:flex-1", contentClassName)}>{children}</div>
        {rail ? (
          <div className="min-w-0 xl:w-[18rem] xl:shrink-0">
            <aside className={cn("hidden xl:block", railClassName)}>{rail}</aside>
            <div className="xl:hidden">{rail}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
