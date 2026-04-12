"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/primitives/card";
import type {
  PirateApiModerationCase,
  PirateApiModerationCaseStatus,
} from "@/lib/pirate-api";
import { cn } from "@/lib/utils";

function formatCaseTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

function formatPriorityLabel(priority: PirateApiModerationCase["priority"]): string {
  switch (priority) {
    case "high":
      return "High priority";
    case "medium":
      return "Medium priority";
    default:
      return "Low priority";
  }
}

function formatOpenedByLabel(openedBy: PirateApiModerationCase["opened_by"]): string {
  switch (openedBy) {
    case "platform_analysis":
      return "Opened by platform analysis";
    case "user_report":
      return "Opened by member reports";
    case "mixed":
      return "Opened by mixed signals";
    default:
      return openedBy;
  }
}

function formatQueueScopeLabel(scope: PirateApiModerationCase["queue_scope"]): string {
  return scope === "platform" ? "Platform floor" : "Community queue";
}

function getPriorityAccent(priority: PirateApiModerationCase["priority"]): string {
  switch (priority) {
    case "high":
      return "before:bg-[oklch(0.72_0.18_38)]";
    case "medium":
      return "before:bg-[oklch(0.74_0.14_82)]";
    default:
      return "before:bg-[oklch(0.62_0.11_250)]";
  }
}

export interface CommunityModerationQueueProps {
  cases: PirateApiModerationCase[];
  communityName: string;
  activeStatus: PirateApiModerationCaseStatus;
  onCaseSelect: (moderationCaseId: string) => void;
  onStatusChange: (status: PirateApiModerationCaseStatus) => void;
}

export function CommunityModerationQueue({
  cases,
  communityName,
  activeStatus,
  onCaseSelect,
  onStatusChange,
}: CommunityModerationQueueProps) {
  const emptyTitle = activeStatus === "open" ? "Queue is clear" : "No resolved cases yet";
  const emptyBody = activeStatus === "open"
    ? `${communityName} has no open moderation cases right now.`
    : `${communityName} has not resolved any moderation cases yet.`;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[var(--radius-4xl)] border-border-soft bg-card shadow-none">
        <CardHeader className="gap-4 border-b border-border-soft pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-[clamp(1.875rem,4vw,3rem)] font-semibold tracking-tight text-foreground">
                Needs Review
              </CardTitle>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Work the queue directly from the community shell. Open cases stay first. Resolved cases remain searchable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => onStatusChange("open")}
                variant={activeStatus === "open" ? "default" : "secondary"}
              >
                Open cases
              </Button>
              <Button
                onClick={() => onStatusChange("resolved")}
                variant={activeStatus === "resolved" ? "default" : "secondary"}
              >
                Resolved
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {cases.length === 0 ? (
            <div className="px-6 py-8">
              <div className="text-xl font-semibold text-foreground">{emptyTitle}</div>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{emptyBody}</p>
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {cases.map((item) => (
                <button
                  className={cn(
                    "relative flex w-full flex-col gap-3 overflow-hidden px-6 py-5 text-left transition-colors hover:bg-muted/35",
                    "before:absolute before:inset-y-4 before:left-0 before:w-1 before:rounded-r-full",
                    getPriorityAccent(item.priority),
                  )}
                  key={item.moderation_case_id}
                  onClick={() => onCaseSelect(item.moderation_case_id)}
                  type="button"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-foreground">
                        Post {item.post_id}
                      </div>
                      <div className="text-base text-muted-foreground">
                        {formatOpenedByLabel(item.opened_by)}
                      </div>
                    </div>
                    <div className="text-base text-muted-foreground">
                      Updated {formatCaseTimestamp(item.updated_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-base text-foreground/80">
                    <span>{formatPriorityLabel(item.priority)}</span>
                    <span>{formatQueueScopeLabel(item.queue_scope)}</span>
                    <span>{item.status === "open" ? "Open" : "Resolved"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
