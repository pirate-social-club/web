"use client";

import * as React from "react";

import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

export interface CommunitySidebarRequirementsProps {
  className?: string;
  items: string[];
  mode?: "all" | "any";
}

export function CommunitySidebarRequirements({
  className,
  items,
  mode,
}: CommunitySidebarRequirementsProps) {
  const { locale } = useUiLocale();
  const gateCopy = getLocaleMessages(locale, "gates");
  const header =
    mode === "any"
      ? gateCopy.matchModeHeader.anyRequired
      : gateCopy.matchModeHeader.allRequired;

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {mode && items.length > 1 && (
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          {header}
        </p>
      )}
      <ul className="list-disc space-y-1.5 ps-5 text-base leading-snug text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
