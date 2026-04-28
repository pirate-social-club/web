"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CommunitySidebarFlairPolicy } from "./community-sidebar.types";
import { Type } from "@/components/primitives/type";

const MAX_VISIBLE_FLAIRS = 8;

export interface CommunitySidebarFlairsProps {
  className?: string;
  flairPolicy: CommunitySidebarFlairPolicy;
}

export function CommunitySidebarFlairs({
  className,
  flairPolicy,
}: CommunitySidebarFlairsProps) {
  if (!flairPolicy.flairEnabled) return null;

  const activeFlairs = flairPolicy.definitions
    .filter((f) => f.status === "active")
    .sort((a, b) => a.position - b.position);

  if (activeFlairs.length === 0) return null;

  const visibleFlairs = activeFlairs.slice(0, MAX_VISIBLE_FLAIRS);
  const remaining = activeFlairs.length - visibleFlairs.length;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleFlairs.map((flair) => (
        <a
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-base transition-opacity hover:opacity-80"
          href={`?flair=${encodeURIComponent(flair.flairId)}`}
          key={flair.flairId}
          style={
            flair.colorToken
              ? { backgroundColor: `${flair.colorToken}15`, color: flair.colorToken }
              : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
          }
        >
          {flair.label}
        </a>
      ))}
      {remaining > 0 && (
        <Type as="span" variant="caption" className="inline-flex items-center rounded-full px-2.5 py-0.5 /60">
          +{remaining}
        </Type>
      )}
    </div>
  );
}
