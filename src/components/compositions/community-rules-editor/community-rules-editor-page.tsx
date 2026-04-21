"use client";

import * as React from "react";

import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import { CommunityModerationSaveFooter } from "@/components/compositions/community-moderation-shell/community-moderation-save-footer";
import { useRouteMessages } from "@/app/authenticated-routes/route-core";

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
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-6 md:gap-8", className)}>
      <div className="flex min-w-0 items-start gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-[1.875rem] font-semibold tracking-tight md:text-[2.25rem]">{mc.title}</h1>
          <p className="text-base text-muted-foreground">
            {mc.description}
          </p>
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
          <div className="flex flex-col gap-1 text-base text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>{mc.maxChars100}</span>
            <span>{ruleName.length}/100</span>
          </div>
        </div>

        <div className="space-y-3">
          <Textarea
            className="min-h-36 rounded-[1.75rem] px-5 py-4"
            onChange={(event) => onDescriptionChange?.(event.target.value)}
            placeholder={mc.descriptionPlaceholder}
            value={description}
          />
          <div className="flex flex-col gap-1 text-base text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>{mc.maxChars500}</span>
            <span>{description.length}/500</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{mc.reportingTitle}</h2>
            <p className="text-base text-muted-foreground">
              {mc.reportingDescription}
            </p>
          </div>

          <div className="space-y-3">
            <Input
              onChange={(event) => onReportReasonChange?.(event.target.value)}
              placeholder={mc.reportReasonPlaceholder}
              size="lg"
              value={reportReason}
            />
            <div className="flex flex-col gap-1 text-base text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{mc.reportReasonHint}</span>
              <span>{reportReason.length}/100</span>
            </div>
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
