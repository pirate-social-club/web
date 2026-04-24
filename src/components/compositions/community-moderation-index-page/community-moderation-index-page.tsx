"use client";

import * as React from "react";
import { ArrowLeft, CaretRight } from "@phosphor-icons/react";

import type { CommunityModerationNavSection } from "@/components/compositions/community-moderation-shell/community-moderation-shell";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { Type } from "@/components/primitives/type";

export interface CommunityModerationIndexPageProps {
  className?: string;
  mobileLayout?: boolean;
  onBackClick?: () => void;
  sections: CommunityModerationNavSection[];
  showTitle?: boolean;
}

export function CommunityModerationIndexPage({
  className,
  mobileLayout = false,
  onBackClick,
  sections,
  showTitle = true,
}: CommunityModerationIndexPageProps) {
  const { copy } = useRouteMessages();
  if (mobileLayout) {
    return (
      <section className={cn("flex w-full flex-col gap-5", className)}>
        <div className={cn("flex flex-col gap-4", !showTitle && !onBackClick && "hidden")}>
          {onBackClick ? (
            <div>
              <Button leadingIcon={<ArrowLeft className="size-5" />} onClick={onBackClick} variant="ghost">
                {copy.moderation.index.backLabel}
              </Button>
            </div>
          ) : null}
          {showTitle ? (
            <Type as="h1" variant="h1" className="md:text-4xl">
              {copy.moderation.index.title}
            </Type>
          ) : null}
        </div>

        <div className="w-full space-y-6">
          {sections.map((section) => (
            <section className="w-full space-y-2" key={section.label}>
              <div className="px-4 text-base uppercase tracking-[0.08em] text-muted-foreground/55">
                {section.label}
              </div>
              <div className="w-full border-y border-border-soft">
                {section.items.map((item, index) => (
                  <button
                    className={cn(
                      "flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition-colors hover:bg-muted/20",
                      index < section.items.length - 1 ? "border-b border-border-soft" : undefined,
                    )}
                    key={item.label}
                    onClick={item.onSelect}
                    type="button"
                  >
                    <Type as="span" variant="label" className="min-w-0 ">{item.label}</Type>
                    <CaretRight className="size-5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-2xl flex-col gap-6", className)}>
      <div className={cn("flex flex-col gap-4", !showTitle && !onBackClick && "hidden")}>
        {onBackClick ? (
          <div>
            <Button leadingIcon={<ArrowLeft className="size-5" />} onClick={onBackClick} variant="ghost">
              Back
            </Button>
          </div>
        ) : null}
        {showTitle ? (
          <Type as="h1" variant="h1" className="md:text-4xl">
            Mod tools
          </Type>
        ) : null}
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section className="space-y-2" key={section.label}>
            <div className="px-1 text-base uppercase tracking-[0.08em] text-muted-foreground/55">
              {section.label}
            </div>
            <div className="w-full overflow-hidden rounded-[var(--radius-2xl)] border border-border-soft bg-card">
              {section.items.map((item, index) => (
                <button
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors hover:bg-muted/30",
                    index < section.items.length - 1 ? "border-b border-border-soft" : undefined,
                  )}
                  key={item.label}
                  onClick={item.onSelect}
                  type="button"
                >
                  <Type as="span" variant="label" className="min-w-0 ">{item.label}</Type>
                  <CaretRight className="size-5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
