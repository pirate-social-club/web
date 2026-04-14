"use client";

import * as React from "react";

export interface YourSpacesRailItem {
  id: string;
  label: string;
  displayName: string;
  memberCount: number;
  href: string;
}

export interface YourSpacesRailProps {
  items: YourSpacesRailItem[];
  title?: string;
}

function formatMemberCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString("en-US");
}

export function YourSpacesRail({
  items,
  title = "Your spaces",
}: YourSpacesRailProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border-soft bg-card">
      <div className="border-b border-border-soft px-5 py-4">
        <div className="text-lg font-semibold text-foreground">{title}</div>
      </div>
      <div className="divide-y divide-border-soft">
        {items.map((item) => (
          <a
            className="block px-5 py-4 transition-colors hover:bg-muted/50"
            href={item.href}
            key={item.id}
          >
            <div className="text-base font-medium text-foreground">
              {item.displayName}
            </div>
            <div className="text-base text-muted-foreground">
              {formatMemberCount(item.memberCount)} members
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
