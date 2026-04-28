"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";

import type { CommunityModerationNavSection } from "@/components/compositions/community/moderation-shell/community-moderation-shell";
import { StackedSectionNav } from "@/components/compositions/system/stacked-section-nav/stacked-section-nav";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import { useUiLocale } from "@/lib/ui-locale";
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
  const copy = defaultRouteCopy;
  const { isRtl } = useUiLocale();
  if (mobileLayout) {
    return (
      <section className={cn("flex w-full flex-col gap-5", className)}>
        <div className={cn("flex flex-col gap-4", !showTitle && !onBackClick && "hidden")}>
          {onBackClick ? (
            <div>
              <Button leadingIcon={isRtl ? <ArrowRight className="size-5" /> : <ArrowLeft className="size-5" />} onClick={onBackClick} variant="ghost">
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

        <StackedSectionNav mobileLayout sections={sections} />
      </section>
    );
  }

  return (
    <section className={cn("mx-auto flex w-full max-w-2xl flex-col gap-6", className)}>
      <div className={cn("flex flex-col gap-4", !showTitle && !onBackClick && "hidden")}>
        {onBackClick ? (
          <div>
            <Button leadingIcon={isRtl ? <ArrowRight className="size-5" /> : <ArrowLeft className="size-5" />} onClick={onBackClick} variant="ghost">
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

      <StackedSectionNav sections={sections} />
    </section>
  );
}
