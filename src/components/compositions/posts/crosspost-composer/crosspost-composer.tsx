"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { CrosspostSourcePreviewCard } from "../crosspost-source-preview-card";
import { FieldLabel, ShellPill } from "../post-composer/post-composer-fields";
import type { CrosspostComposerProps, CrosspostTargetCommunity } from "./crosspost-composer.types";

function selectedTargetLabel(selectedCommunity: CrosspostTargetCommunity | null | undefined) {
  return selectedCommunity ? `c/${selectedCommunity.displayName}` : "Choose community";
}

function targetStatusLabel(selectedCommunity: CrosspostTargetCommunity | null | undefined) {
  if (selectedCommunity?.status === "ready") return null;
  if (!selectedCommunity?.statusLabel) return null;
  return selectedCommunity.statusLabel;
}

export function CrosspostComposer({
  communityPickerEmptyLabel,
  communityPickerItems,
  communityPickerSearchPlaceholder = "Search communities",
  communityPickerTitle = "Choose community",
  onCommunitySearchQueryChange,
  onSelectCommunity,
  onTitleValueChange,
  selectedCommunity,
  source,
  submit,
  titleLabel = "Title",
  titlePlaceholder = "Add a title for this crosspost",
  titleValue = "",
}: CrosspostComposerProps) {
  const titleInputId = React.useId();
  const statusLabel = targetStatusLabel(selectedCommunity);
  const selectedCommunityLabel = selectedTargetLabel(selectedCommunity);

  return (
    <div className="w-full space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Type as="h1" variant="h2">
          Crosspost
        </Type>
        <ShellPill
          avatarSrc={selectedCommunity?.avatarSrc ?? undefined}
          communities={communityPickerItems}
          emptyLabel={communityPickerEmptyLabel}
          onSelectCommunity={onSelectCommunity}
          onSearchQueryChange={onCommunitySearchQueryChange}
          pickerSearchPlaceholder={communityPickerSearchPlaceholder}
          pickerTitle={communityPickerTitle}
        >
          {selectedCommunityLabel}
        </ShellPill>
      </div>

      <Card className="overflow-hidden bg-card shadow-none">
        <div className="space-y-5 p-4 sm:p-5">
          <div>
            <FieldLabel htmlFor={titleInputId} label={titleLabel} />
            <Input
              id={titleInputId}
              onChange={(event) => onTitleValueChange?.(event.target.value)}
              placeholder={titlePlaceholder}
              value={titleValue}
            />
          </div>

          <CrosspostSourcePreviewCard source={source} />

          {statusLabel ? (
            <Type as="p" variant="caption" className="text-muted-foreground">
              {statusLabel}
            </Type>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-soft px-4 py-3 sm:px-5">
          <Type
            aria-hidden={!submit?.error}
            as="p"
            variant="caption"
            className={cn(!submit?.error && "invisible")}
          >
            {submit?.error ?? "Error"}
          </Type>
          <Button
            disabled={submit?.disabled}
            loading={submit?.loading}
            onClick={submit?.onSubmit}
          >
            {submit?.label ?? "Post"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
