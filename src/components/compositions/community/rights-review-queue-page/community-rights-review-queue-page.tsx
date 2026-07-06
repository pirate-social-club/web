"use client";

import * as React from "react";
import { Check, MusicNotes, WarningOctagon, X } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import { PostCardHeader } from "@/components/compositions/posts/post-card/post-card-header";
import { PostCardMedia } from "@/components/compositions/posts/post-card/post-card-media";
import { postCardType } from "@/components/compositions/posts/post-card/post-card.styles";
import type { PostCardContent } from "@/components/compositions/posts/post-card/post-card.types";
import { cn } from "@/lib/utils";

export interface RightsReviewQueueItem {
  caseId: string;
  status: "open" | "under_review" | "resolved" | "blocked";
  triggerSource: string;
  policyReasonCode: string | null;
  policyReason: string | null;
  createdAt: string;
  postPreview?: {
    title?: string;
    body?: string;
    imageSrc?: string;
    authorLabel?: string;
    authorHref?: string;
  };
  matches: Array<{
    title: string;
    subtitle?: string;
  }>;
}

export interface CommunityRightsReviewQueuePageProps {
  className?: string;
  loading?: boolean;
  cases: RightsReviewQueueItem[];
  onClear?: (caseId: string) => void;
  onNeedsSource?: (caseId: string) => void;
  onBlock?: (caseId: string) => void;
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

function triggerLabel(triggerSource: string): string {
  switch (triggerSource) {
    case "acrcloud_match":
      return "Catalog match";
    case "declared_reference_mismatch":
      return "Reference mismatch";
    case "manual_report":
      return "Manual report";
    case "operator_escalation":
      return "Operator escalation";
    default:
      return triggerSource.replaceAll("_", " ");
  }
}

function statusLabel(status: RightsReviewQueueItem["status"]): string {
  switch (status) {
    case "under_review":
      return "Under review";
    case "blocked":
      return "Blocked";
    case "resolved":
      return "Resolved";
    case "open":
    default:
      return "Open";
  }
}

function previewContent(preview: NonNullable<RightsReviewQueueItem["postPreview"]>): PostCardContent {
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

function QueuePostPreview({
  createdAt,
  preview,
}: {
  createdAt: string;
  preview: NonNullable<RightsReviewQueueItem["postPreview"]>;
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

export function CommunityRightsReviewQueuePage({
  className,
  loading = false,
  cases,
  onClear,
  onNeedsSource,
  onBlock,
  processingCaseId,
}: CommunityRightsReviewQueuePageProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-6", className)}>
      <div className="space-y-2">
        <Type as="h1" variant="h2">
          Rights
        </Type>
        <Type as="p" className="max-w-2xl text-muted-foreground" variant="body">
          Review videos whose soundtrack analysis found a possible catalog-song rights issue.
        </Type>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center">
            <Type as="p" className="text-muted-foreground" variant="body">
              Loading rights queue&hellip;
            </Type>
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <MusicNotes className="size-8 text-muted-foreground/60" />
            <Type as="p" className="text-muted-foreground" variant="body">
              No rights cases need review right now.
            </Type>
          </div>
        ) : (
          <div>
            {cases.map((caseItem, index) => {
              const processing = processingCaseId === caseItem.caseId;
              return (
                <div key={caseItem.caseId}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Type
                        as="span"
                        className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-warning"
                        variant="caption"
                      >
                        {triggerLabel(caseItem.triggerSource)}
                      </Type>
                      <Type
                        as="span"
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5",
                          caseItem.status === "under_review"
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/10 text-destructive",
                        )}
                        variant="caption"
                      >
                        {statusLabel(caseItem.status)}
                      </Type>
                    </div>

                    {caseItem.postPreview ? (
                      <QueuePostPreview createdAt={caseItem.createdAt} preview={caseItem.postPreview} />
                    ) : (
                      <Type as="p" className="text-muted-foreground" variant="body">
                        Post preview unavailable.
                      </Type>
                    )}

                    <div className="border-l border-border-soft pl-4">
                      <Type as="p" variant="body">
                        {caseItem.policyReason ?? "Soundtrack analysis found a possible rights issue."}
                      </Type>
                      {caseItem.policyReasonCode ? (
                        <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
                          Reason: {caseItem.policyReasonCode.replaceAll("_", " ")}
                        </Type>
                      ) : null}
                    </div>

                    {caseItem.matches.length > 0 ? (
                      <div className="grid gap-2">
                        {caseItem.matches.slice(0, 3).map((match, matchIndex) => (
                          <div
                            className="rounded-md border border-border-soft bg-muted/30 px-3 py-2"
                            key={`${caseItem.caseId}-${match.title}-${matchIndex}`}
                          >
                            <Type as="p" variant="body-strong">
                              {match.title}
                            </Type>
                            {match.subtitle ? (
                              <Type as="p" className="text-muted-foreground" variant="caption">
                                {match.subtitle}
                              </Type>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="h-9"
                        disabled={processing}
                        leadingIcon={<Check className="size-4" />}
                        loading={processing}
                        onClick={() => onClear?.(caseItem.caseId)}
                        size="sm"
                        variant="default"
                      >
                        Clear
                      </Button>
                      <Button
                        className="h-9"
                        disabled={processing}
                        leadingIcon={<WarningOctagon className="size-4" />}
                        onClick={() => onNeedsSource?.(caseItem.caseId)}
                        size="sm"
                        variant="outline"
                      >
                        Require source
                      </Button>
                      <Button
                        className="h-9"
                        disabled={processing}
                        leadingIcon={<X className="size-4" />}
                        onClick={() => onBlock?.(caseItem.caseId)}
                        size="sm"
                        variant="outline"
                      >
                        Block
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
