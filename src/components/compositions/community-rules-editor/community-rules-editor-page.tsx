"use client";

import * as React from "react";
import {
  CaretRight,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";

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
  return (
    <section className={cn("mx-auto flex w-full max-w-[64rem] flex-col gap-8", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-[2.25rem] font-semibold tracking-tight">Name and describe your rule</h1>
            <p className="text-base text-muted-foreground">
              Rules set the expectations for members and visitors in your community.
            </p>
          </div>
        </div>
        <Button disabled={saveDisabled} loading={saveLoading} onClick={onSave}>
          Save
        </Button>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <Input
            onChange={(event) => onRuleNameChange?.(event.target.value)}
            placeholder="Rule name"
            size="lg"
            value={ruleName}
          />
          <div className="flex items-center justify-between text-base text-muted-foreground">
            <span>Max characters 100</span>
            <span>{ruleName.length}/100</span>
          </div>
        </div>

        <div className="space-y-3">
          <Textarea
            className="min-h-36 rounded-[1.75rem] px-5 py-4"
            onChange={(event) => onDescriptionChange?.(event.target.value)}
            placeholder="Description"
            value={description}
          />
          <div className="flex items-center justify-between text-base text-muted-foreground">
            <span>Max characters 500</span>
            <span>{description.length}/500</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Reporting</h2>
            <p className="text-base text-muted-foreground">
              Users or mods can select a report reason when reporting content.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              onChange={(event) => onReportReasonChange?.(event.target.value)}
              placeholder="Report reason"
              size="lg"
              value={reportReason}
            />
            <div className="flex items-center justify-between text-base text-muted-foreground">
              <span>By default, this is the same as your rule name.</span>
              <span>{reportReason.length}/100</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-border-soft pb-4">
            <div className="text-lg font-medium">Show when reporting</div>
            <button className="inline-flex items-center gap-3 text-base text-muted-foreground transition-colors hover:text-foreground" type="button">
              <span>Posts, comments, and chat messages</span>
              <CaretRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
