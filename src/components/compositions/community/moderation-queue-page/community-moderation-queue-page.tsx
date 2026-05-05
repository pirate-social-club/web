"use client";

import * as React from "react";
import { Check, ShieldCheck, X } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { PostCardHeader } from "@/components/compositions/posts/post-card/post-card-header";
import { PostCardMedia } from "@/components/compositions/posts/post-card/post-card-media";
import { postCardType } from "@/components/compositions/posts/post-card/post-card.styles";
import type { PostCardContent } from "@/components/compositions/posts/post-card/post-card.types";

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
    authorHref?: string;
  };
  visualPolicySummary?: {
    title: string;
    description: string;
    reasons: string[];
    evidence: Array<{ label: string; value: string }>;
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
      return { label: "High priority", className: "bg-destructive/10 text-destructive" };
    case "medium":
      return { label: "Medium priority", className: "bg-warning/10 text-warning" };
    case "low":
    default:
      return { label: "Low priority", className: "bg-muted text-muted-foreground" };
  }
}

function previewContent(preview: NonNullable<ModerationQueueCaseItem["postPreview"]>): PostCardContent {
  if (preview.imageSrc) {
    return {
      type: "image",
      src: preview.imageSrc,
      alt: preview.title ?? "",
      caption: preview.body,
      aspectRatio: 16 / 9,
    };
  }
  return {
    type: "text",
    body: preview.body ?? "",
  };
}

function formatVisualSummary(summary: NonNullable<ModerationQueueCaseItem["visualPolicySummary"]>): string {
  if (summary.reasons.length > 0) {
    return `Flagged: ${summary.reasons.join(", ")}`;
  }
  return summary.title;
}

function formatVisualEvidence(summary: NonNullable<ModerationQueueCaseItem["visualPolicySummary"]>): string | null {
  const values = summary.evidence
    .filter((item) => item.label !== "Commercial")
    .map((item) => item.value)
    .filter((value) => value && value !== "none");
  return values.length > 0 ? `Detected: ${values.join(", ")}` : null;
}

function QueuePostPreview({
  createdAt,
  preview,
}: {
  createdAt: string;
  preview: NonNullable<ModerationQueueCaseItem["postPreview"]>;
}) {
  const content = previewContent(preview);

  return (
    <div className="flex max-w-2xl flex-col gap-2.5">
      <PostCardHeader
        byline={{
          author: preview.authorLabel
            ? {
                kind: "user",
                label: preview.authorLabel,
                href: preview.authorHref,
                avatarSeed: preview.authorLabel,
              }
            : undefined,
          timestampLabel: formatRelativeTime(createdAt),
        }}
        identityPresentation="author_primary"
        menuItems={[]}
        viewContext="community"
      />
      {preview.title ? (
        <Type
          as="p"
          className={cn(postCardType.title, "max-w-[72ch] self-start text-start font-semibold text-foreground")}
          variant="body-strong"
        >
          {preview.title}
        </Type>
      ) : null}
      <PostCardMedia content={content} />
    </div>
  );
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
              const visualSummary = caseItem.visualPolicySummary
                ? formatVisualSummary(caseItem.visualPolicySummary)
                : null;
              const visualEvidence = caseItem.visualPolicySummary
                ? formatVisualEvidence(caseItem.visualPolicySummary)
                : null;

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
                    </div>

                    {/* Post preview */}
                    {preview ? (
                      <QueuePostPreview createdAt={caseItem.createdAt} preview={preview} />
                    ) : (
                      <Type as="p" className="text-muted-foreground" variant="body">
                        Post preview unavailable.
                      </Type>
                    )}

                    {caseItem.visualPolicySummary ? (
                      <div className="border-l border-border-soft pl-4">
                        <Type as="p" variant="body">
                          {visualSummary}
                        </Type>
                        {visualEvidence ? (
                          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
                            {visualEvidence}
                          </Type>
                        ) : null}
                      </div>
                    ) : null}

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
