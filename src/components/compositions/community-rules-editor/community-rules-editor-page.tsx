"use client";

import * as React from "react";

import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import { CommunityModerationSaveFooter } from "@/components/compositions/community-moderation-shell/community-moderation-save-footer";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";
import { Type } from "@/components/primitives/type";

export interface CommunityRulesEditorPageProps {
  className?: string;
  description: string;
  onBackClick?: () => void;
  onDescriptionChange?: (value: string) => void;
  onReportReasonChange?: (value: string) => void;
  onRuleNameChange?: (value: string) => void;
  onSave?: () => void;
  reportReason: string;
  ruleName: string;
  saveDisabled?: boolean;
  saveLoading?: boolean;
}

export function CommunityRulesEditorPage({
  className,
  description,
  onBackClick,
  onDescriptionChange,
  onReportReasonChange,
  onRuleNameChange,
  onSave,
  reportReason,
  ruleName,
  saveDisabled = false,
  saveLoading = false,
}: CommunityRulesEditorPageProps) {
  const { copy } = useRouteMessages();
  const mc = copy.moderation.rules;
  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="flex min-w-0 items-start gap-4">
        <div className="min-w-0 space-y-2">
          <Type as="h1" variant="h1" className="md:text-4xl">{mc.title}</Type>
          <Type as="p" variant="caption" className="">
            {mc.description}
          </Type>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        <div className="space-y-3">
          <Input
            onChange={(event) => onRuleNameChange?.(event.target.value)}
            placeholder={mc.namePlaceholder}
            size="lg"
            value={ruleName}
          />
          <Type as="div" variant="caption" className="flex flex-col gap-1  sm:flex-row sm:items-center sm:justify-between">
            <span>{mc.maxChars100}</span>
            <span>{ruleName.length}/100</span>
          </Type>
        </div>

        <div className="space-y-3">
          <Textarea
            className="min-h-36 rounded-[var(--radius-2_5xl)] px-5 py-4"
            onChange={(event) => onDescriptionChange?.(event.target.value)}
            placeholder={mc.descriptionPlaceholder}
            value={description}
          />
          <Type as="div" variant="caption" className="flex flex-col gap-1  sm:flex-row sm:items-center sm:justify-between">
            <span>{mc.maxChars500}</span>
            <span>{description.length}/500</span>
          </Type>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Type as="h2" variant="h2" className="">{mc.reportingTitle}</Type>
            <Type as="p" variant="caption" className="">
              {mc.reportingDescription}
            </Type>
          </div>

          <div className="space-y-3">
            <Input
              onChange={(event) => onReportReasonChange?.(event.target.value)}
              placeholder={mc.reportReasonPlaceholder}
              size="lg"
              value={reportReason}
            />
            <Type as="div" variant="caption" className="flex flex-col gap-1  sm:flex-row sm:items-center sm:justify-between">
              <span>{mc.reportReasonHint}</span>
              <span>{reportReason.length}/100</span>
            </Type>
          </div>
        </div>
      </div>

      <CommunityModerationSaveFooter
        disabled={saveDisabled}
        loading={saveLoading}
        onSave={onSave}
      />
    </section>
  );
}
