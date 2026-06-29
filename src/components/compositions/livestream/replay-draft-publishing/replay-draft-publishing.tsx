"use client";

import { Play } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { FormFieldLabel, FormNote } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { postCardReadableWidth } from "@/components/compositions/posts/post-card/post-card.styles";
import {
  RoyaltySplitEditor,
  type AssetRoyaltySplitState,
} from "@/components/compositions/posts/post-composer/royalty-split-editor";

export type ReplayDraftStatus = "not_recorded" | "processing" | "ready" | "review_pending" | "published" | "failed";
export type ReplayDraftAccessPolicy = "free" | "included_with_ticket" | "paid";
export type ReplayDraftApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export type ReplayDraftPublishingProps = {
  accessPolicy: ReplayDraftAccessPolicy;
  approvalStatus: ReplayDraftApprovalStatus;
  caption: string;
  className?: string;
  durationLabel?: string;
  editable?: boolean;
  onAccessPolicyChange?: (value: ReplayDraftAccessPolicy) => void;
  onCaptionChange?: (value: string) => void;
  onPriceChange?: (value: string) => void;
  onPublish?: () => void;
  onRoyaltySplitChange: (value: AssetRoyaltySplitState) => void;
  onSave?: () => void;
  onTitleChange?: (value: string) => void;
  priceLabel?: string;
  publishDisabledReason?: string;
  publishLabel?: string;
  saveDisabled?: boolean;
  saveLabel?: string;
  royaltySplit: AssetRoyaltySplitState;
  status: ReplayDraftStatus;
  supportedAccessPolicies?: ReplayDraftAccessPolicy[];
  thumbnailSrc?: string;
  title: string;
};

type StatusTone = "default" | "warning" | "success" | "destructive";

const toneText: Record<StatusTone, string> = {
  default: "text-foreground",
  warning: "text-warning",
  success: "text-success",
  destructive: "text-destructive",
};

const statusDisplay: Record<ReplayDraftStatus, { label: string; tone: StatusTone }> = {
  not_recorded: { label: "Not recorded", tone: "default" },
  processing: { label: "Processing", tone: "warning" },
  ready: { label: "Draft ready", tone: "success" },
  review_pending: { label: "Review pending", tone: "warning" },
  published: { label: "Published", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
};

const accessPolicyLabel: Record<ReplayDraftAccessPolicy, string> = {
  free: "Free replay",
  included_with_ticket: "Included with live ticket",
  paid: "Paid replay",
};

function blockingNote(
  status: ReplayDraftStatus,
  approvalStatus: ReplayDraftApprovalStatus,
): { tone: "destructive" | "warning"; text: string } | null {
  if (status === "not_recorded") return { tone: "warning", text: "This live room was not recorded." };
  if (status === "failed") return { tone: "destructive", text: "Recording failed." };
  if (status === "processing") return { tone: "warning", text: "Recording is still processing." };
  if (status === "review_pending") return { tone: "warning", text: "Waiting on rights review." };
  if (approvalStatus === "rejected") return { tone: "destructive", text: "A split was rejected." };
  if (approvalStatus === "pending") return { tone: "warning", text: "Waiting on split approvals." };
  return null;
}

function ReadOnlyRoyaltySplit({ value }: { value: AssetRoyaltySplitState }) {
  const totalSharePct = value.allocations.reduce((sum, allocation) => sum + allocation.sharePct, 0);
  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Type as="div" variant="body-strong">Royalty split</Type>
          <Type as="p" variant="body" className="text-muted-foreground">
            These are the draft replay allocations copied from the live room.
          </Type>
        </div>
        <div className="shrink-0 rounded-full bg-primary-subtle px-3 py-1 font-semibold tabular-nums text-primary">
          {totalSharePct}%
        </div>
      </div>
      <div className="space-y-3">
        {value.allocations.length === 0 ? (
          <Type as="p" variant="body" className="text-muted-foreground">
            No replay split is attached yet.
          </Type>
        ) : value.allocations.map((allocation) => (
          <div
            className="grid gap-2 rounded-[var(--radius-lg)] border border-border-soft bg-background p-3 sm:grid-cols-[1fr_5rem]"
            key={allocation.id}
          >
            <Type as="span" variant="body" className="min-w-0 truncate font-mono text-muted-foreground">
              {allocation.walletAddress?.trim() || (allocation.recipientKind === "creator" ? "Creator" : "Recipient")}
            </Type>
            <Type as="span" variant="body-strong" className="text-end tabular-nums">
              {allocation.sharePct}%
            </Type>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReplayDraftPublishing({
  accessPolicy,
  approvalStatus,
  caption,
  className,
  durationLabel,
  editable = true,
  onAccessPolicyChange,
  onCaptionChange,
  onPriceChange,
  onPublish,
  onRoyaltySplitChange,
  onSave,
  onTitleChange,
  priceLabel,
  publishDisabledReason,
  publishLabel,
  saveDisabled,
  saveLabel,
  royaltySplit,
  status,
  supportedAccessPolicies,
  thumbnailSrc,
  title,
}: ReplayDraftPublishingProps) {
  const display = statusDisplay[status];
  const previewReady = status === "ready" || status === "review_pending" || status === "published";
  const totalSharePct = royaltySplit.allocations.reduce((sum, a) => sum + a.sharePct, 0);
  const splitValid = totalSharePct === 100;
  const availableAccessPolicies = supportedAccessPolicies && supportedAccessPolicies.length > 0
    ? supportedAccessPolicies
    : (["free", "included_with_ticket", "paid"] satisfies ReplayDraftAccessPolicy[]);
  const accessPolicySupported = availableAccessPolicies.includes(accessPolicy);
  const readyForPublish =
    status === "ready" &&
    approvalStatus !== "pending" &&
    approvalStatus !== "rejected" &&
    splitValid &&
    accessPolicySupported &&
    !publishDisabledReason;
  const note = blockingNote(status, approvalStatus);

  return (
    <div className={cn(postCardReadableWidth, "w-full space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <Type as="h1" variant="h2">Review and publish recording</Type>
        <Type variant="label" className={cn(toneText[display.tone])}>{display.label}</Type>
      </div>

      <div className="space-y-8">
        <section className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-muted">
            {thumbnailSrc ? (
              <img alt="" className="size-full object-cover" src={thumbnailSrc} />
            ) : (
              <div className="flex size-full items-center justify-center p-4 text-center">
                <Type variant="caption">No thumbnail yet</Type>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
              <div className="min-w-0">
                <Type as="p" variant="body-strong" className="truncate text-white">{title}</Type>
                {durationLabel ? (
                  <Type variant="caption" className="text-white/80">{durationLabel}</Type>
                ) : null}
              </div>
              <Button
                aria-label={previewReady ? "Preview replay" : "Replay preview unavailable"}
                className="bg-white text-black hover:bg-white/90"
                disabled={!previewReady}
                size="icon"
                variant="secondary"
              >
                <Play className="size-5" weight="fill" />
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <FormFieldLabel label="Title" />
          <Input
            onChange={(event) => onTitleChange?.(event.target.value)}
            readOnly={!editable}
            value={title}
          />
        </section>

        <section className="space-y-3">
          <FormFieldLabel label="Thumbnail" />
          <Button className="w-full justify-start" disabled={!editable} variant="outline">Choose image</Button>
        </section>

        <section className="space-y-3">
          <FormFieldLabel label="Caption" />
          <Textarea
            onChange={(event) => onCaptionChange?.(event.target.value)}
            readOnly={!editable}
            rows={4}
            value={caption}
          />
        </section>

        <section className="space-y-3">
          <FormFieldLabel label="Access" />
          <Select
            disabled={!editable || availableAccessPolicies.length <= 1}
            onValueChange={(value) => onAccessPolicyChange?.(value as ReplayDraftAccessPolicy)}
            value={accessPolicy}
          >
            <SelectTrigger>
              <span>{accessPolicyLabel[accessPolicy]}</span>
            </SelectTrigger>
            <SelectContent>
              {availableAccessPolicies.map((policy) => (
                <SelectItem key={policy} value={policy}>
                  {accessPolicyLabel[policy]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {accessPolicy === "paid" ? (
            <div className="space-y-2">
              <FormFieldLabel label="Price" />
              <Input
                onChange={(event) => onPriceChange?.(event.target.value)}
                value={priceLabel ?? ""}
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          {editable ? (
            <RoyaltySplitEditor onChange={onRoyaltySplitChange} value={royaltySplit} />
          ) : (
            <ReadOnlyRoyaltySplit value={royaltySplit} />
          )}
        </section>
      </div>

      <div className="space-y-2">
        {onSave ? (
          <Button className="w-full" disabled={saveDisabled} onClick={onSave} variant="secondary">
            {saveLabel ?? "Save draft"}
          </Button>
        ) : null}
        <Button className="w-full" disabled={!readyForPublish} onClick={onPublish}>
          {publishLabel ?? "Publish replay"}
        </Button>
        {publishDisabledReason ? <FormNote tone="warning">{publishDisabledReason}</FormNote> : null}
        {note ? <FormNote tone={note.tone}>{note.text}</FormNote> : null}
      </div>
    </div>
  );
}
