"use client";

import * as React from "react";
import type { Community as ApiCommunity, LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";

type CommunityLabelDefinition = NonNullable<ApiCommunity["label_policy"]>["definitions"][number];

export function getActiveCommunityLabels(
  community?: { label_policy?: ApiCommunity["label_policy"] | null } | null,
): CommunityLabelDefinition[] {
  return community?.label_policy?.label_enabled
    ? community.label_policy.definitions.filter((label: CommunityLabelDefinition) => label.status === "active")
    : [];
}

function normalizeLabelId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^(cld|lbl)_/u, "");
}

export function PostLabelDialog({
  busy,
  labels,
  onOpenChange,
  onSubmit,
  open,
  post,
}: {
  busy?: boolean;
  labels: CommunityLabelDefinition[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (labelId: string | null) => void;
  open: boolean;
  post: ApiPost | null;
}) {
  const currentLabelId = normalizeLabelId(post?.label?.id ?? post?.post.label ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set tag</DialogTitle>
          <DialogDescription>
            Choose the board tag moderators want shown for this post.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {labels.map((label) => {
            const selected = currentLabelId === normalizeLabelId(label.id);
            return (
              <button
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-start text-base transition-colors hover:bg-muted disabled:opacity-50"
                disabled={busy}
                key={label.id}
                onClick={() => onSubmit(label.id)}
                type="button"
              >
                <span className="min-w-0 truncate">{label.label}</span>
                {selected ? <span className="text-sm text-muted-foreground">Selected</span> : null}
              </button>
            );
          })}
          {labels.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-base text-muted-foreground">
              No active tags.
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button disabled={busy || !currentLabelId} onClick={() => onSubmit(null)} type="button" variant="secondary">
            Clear tag
          </Button>
          <Button disabled={busy} onClick={() => onOpenChange(false)} type="button" variant="ghost">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
