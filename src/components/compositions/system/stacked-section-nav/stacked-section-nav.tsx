"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";

export interface StackedSectionNavItem {
  active?: boolean;
  label: string;
  description?: string;
  onSelect?: () => void;
}

export interface StackedSectionNavSection {
  items: StackedSectionNavItem[];
  label: string;
}

export interface StackedSectionNavProps {
  className?: string;
  mobileLayout?: boolean;
  sections: StackedSectionNavSection[];
}

export function StackedSectionNav({
  className,
  mobileLayout = false,
  sections,
}: StackedSectionNavProps) {
  const { isRtl } = useUiLocale();
  return (
    <div className={cn(mobileLayout ? "w-full space-y-6" : "space-y-6", className)}>
      {sections.map((section) => (
        <section className={cn(mobileLayout ? "w-full space-y-2" : "space-y-2")} key={section.label}>
          {section.label ? (
            <Type
              as="div"
              className={cn("text-muted-foreground/55", mobileLayout ? "px-4" : "px-1")}
              variant="overline"
            >
              {section.label}
            </Type>
          ) : null}
          <div
            className={cn(
              "w-full overflow-hidden",
              mobileLayout
                ? "border-b border-border-soft"
                : "rounded-[var(--radius-2xl)] border border-border-soft bg-card",
            )}
          >
            {section.items.map((item, index) => (
              <button
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center justify-between gap-4 text-start transition-colors hover:bg-muted/30",
                  mobileLayout ? "px-4 py-4" : "px-5 py-4",
                  item.active && "bg-muted/30 text-foreground",
                  index < section.items.length - 1 ? "border-b border-border-soft" : undefined,
                )}
                key={item.label}
                onClick={item.onSelect}
                type="button"
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <Type as="span" variant="label">{item.label}</Type>
                  {item.description ? (
                    <Type as="span" className="text-muted-foreground" variant="caption">{item.description}</Type>
                  ) : null}
                </span>
                {isRtl ? <CaretLeft className="size-5 shrink-0 text-muted-foreground" /> : <CaretRight className="size-5 shrink-0 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
