"use client";

import * as React from "react";

import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";

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
  const copy = gateCopy.sidebar;
  const note =
    items.length === 1
      ? copy.joinSingleNote
      : mode === "any"
        ? copy.joinAnyNote
        : copy.joinAllNote;

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Type as="p" variant="caption">
        {note}
      </Type>
      <ul className="list-disc space-y-1.5 ps-5 text-base leading-snug text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
