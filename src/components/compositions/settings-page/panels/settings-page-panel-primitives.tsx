"use client";

import type { ReactNode } from "react";

import { Type } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function SettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const isMobile = useIsMobile();

  return (
    <section className={cn("space-y-4", isMobile && "space-y-3")}>
      <Type as="h2" variant="h3">{title}</Type>
      {children}
    </section>
  );
}

export function SettingsRow({
  label,
  note,
  trailing,
  value,
}: {
  label: string;
  note?: string;
  trailing?: ReactNode;
  value?: ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex min-h-20 flex-col items-start gap-2 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4",
      isMobile && "px-0",
    )}>
      <div className="min-w-0 flex-1 space-y-1">
        <Type as="div" variant="label" className="">{label}</Type>
        {note ? <div className="text-base text-muted-foreground">{note}</div> : null}
        {value ? (
          <div className="min-w-0 max-w-full text-start text-base text-muted-foreground">
            {value}
          </div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0 text-muted-foreground">{trailing}</div> : null}
    </div>
  );
}
