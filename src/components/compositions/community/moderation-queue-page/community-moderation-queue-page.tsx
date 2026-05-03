"use client";

import * as React from "react";
import { Check, ShieldCheck, X } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface ModerationQueueCaseItem {
  caseId: string;
  postId: string | null;
  priority: "low" | "medium" | "high";
  openedBy: "platform_analysis" | "user_report" | "mixed";
  status: "open" | "resolved";
  createdAt: string;
  postPreview?: {
    title?: string;
    body?: string;
    imageSrc?: string;
    authorLabel?: string;
  };
}

export interface CommunityModerationQueuePageProps {
  className?: string;
  loading?: boolean;
  cases: ModerationQueueCaseItem[];
  onApprove?: (caseId: string) => void;
  onDeny?: (caseId: string) => void;
  onCaseClick?: (caseId: string) => void;
  processingCaseId?: string | null;
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function openedByLabel(openedBy: ModerationQueueCaseItem["openedBy"]): string {
  switch (openedBy) {
    case "platform_analysis":
      return "Flagged by Pirate";
    case "user_report":
      return "Reported by member";
    case "mixed":
      return "Reported and flagged";
    default:
      return "Needs review";
  }
}

function priorityChipProps(priority: ModerationQueueCaseItem["priority"]): {
  label: string;
  className: string;
} {
  switch (priority) {
    case "high":
      return { label: "High", className: "bg-destructive/10 text-destructive" };
    case "medium":
      return { label: "Medium", className: "bg-warning/10 text-warning" };
    case "low":
    default:
      return { label: "Low", className: "bg-muted text-muted-foreground" };
  }
}

export function CommunityModerationQueuePage({
  className,
  loading = false,
  cases,
  onApprove,
  onDeny,
  onCaseClick,
  processingCaseId,
}: CommunityModerationQueuePageProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-6", className)}>
      <div className="space-y-2">
        <Type as="h1" variant="h2">
          Queue
        </Type>
        <Type as="p" className="max-w-2xl text-muted-foreground" variant="body">
          Review posts and comments that need moderator attention.
        </Type>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center">
            <Type as="p" className="text-muted-foreground" variant="body">
              Loading queue...
            </Type>
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/60" />
            <Type as="p" className="text-muted-foreground" variant="body">
              Nothing needs review right now.
            </Type>
          </div>
        ) : (
          <div>
            {cases.map((caseItem, index) => {
              const processing = processingCaseId === caseItem.caseId;
              const source = openedByLabel(caseItem.openedBy);
              const priority = priorityChipProps(caseItem.priority);
              const preview = caseItem.postPreview;

              return (
                <div key={caseItem.caseId}>
                  {index > 0 ? <Separator /> : null}
                  <div
                    className={cn(
                      "flex flex-col gap-4 px-5 py-5",
                      onCaseClick && "cursor-pointer hover:bg-muted/40",
                    )}
                    onClick={() => {
                      onCaseClick?.(caseItem.caseId);
                    }}
                    role={onCaseClick ? "button" : undefined}
                    tabIndex={onCaseClick ? 0 : undefined}
                  >
                    {/* Top row: source, priority, time */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Type
                        as="span"
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5",
                          priority.className,
                        )}
                        variant="caption"
                      >
                        {priority.label}
                      </Type>
                      <Type as="span" variant="caption">
                        {source}
                      </Type>
                      <span className="text-muted-foreground">·</span>
                      <Type as="span" variant="caption">
                        {formatRelativeTime(caseItem.createdAt)}
                      </Type>
                    </div>

                    {/* Post preview */}
                    {preview ? (
                      <div className="flex gap-3">
                        {preview.imageSrc ? (
                          <img
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-md object-cover"
                            src={preview.imageSrc}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          {preview.authorLabel ? (
                            <Type as="p" variant="caption">
                              {preview.authorLabel}
                            </Type>
                          ) : null}
                          {preview.title ? (
                            <Type as="p" className="truncate" variant="body-strong">
                              {preview.title}
                            </Type>
                          ) : null}
                          {preview.body ? (
                            <Type as="p" className="line-clamp-2 text-muted-foreground" variant="body">
                              {preview.body}
                            </Type>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <Type as="p" className="text-muted-foreground" variant="body">
                        Post preview unavailable.
                      </Type>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="h-9"
                        disabled={processing}
                        leadingIcon={<Check className="size-4" />}
                        loading={processing}
                        onClick={(event) => {
                          event.stopPropagation();
                          onApprove?.(caseItem.caseId);
                        }}
                        size="sm"
                        variant="default"
                      >
                        Approve
                      </Button>
                      <Button
                        className="h-9"
                        disabled={processing}
                        leadingIcon={<X className="size-4" />}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeny?.(caseItem.caseId);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
