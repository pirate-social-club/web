import { createUniqueId } from "solid-js";

import { Button, Card, Input, Type, cn } from "../../../design-system";
import { CrosspostSourcePreviewCard } from "../post-card/crosspost-preview";
import { FieldLabel, ShellPill } from "../post-composer/fields";
import type { CrosspostComposerProps, CrosspostTargetCommunity } from "./types";

function selectedTargetLabel(selectedCommunity: CrosspostTargetCommunity | null | undefined) {
  return selectedCommunity ? `c/${selectedCommunity.displayName}` : "Choose community";
}

export function CrosspostComposer(props: CrosspostComposerProps) {
  const titleInputId = createUniqueId();
  const selectedCommunityLabel = () => selectedTargetLabel(props.selectedCommunity);
  const submitError = () => props.submit?.error ?? "Error";

  return (
    <div class="w-full space-y-4 pt-2">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Type as="h1" variant="h2">Crosspost</Type>
        <ShellPill
          avatarSrc={props.selectedCommunity?.avatarSrc ?? undefined}
          communities={props.communityPickerItems}
          emptyLabel={props.communityPickerEmptyLabel}
          onSelectCommunity={props.onSelectCommunity}
          onSearchQueryChange={props.onCommunitySearchQueryChange}
          pickerSearchPlaceholder={props.communityPickerSearchPlaceholder ?? "Search communities"}
          pickerTitle={props.communityPickerTitle ?? "Choose community"}
        >
          {selectedCommunityLabel()}
        </ShellPill>
      </div>

      <Card class="overflow-hidden bg-card shadow-none">
        <div class="space-y-5 p-4 sm:p-5">
          <div>
            <FieldLabel htmlFor={titleInputId} label={props.titleLabel ?? "Title"} />
            <Input
              id={titleInputId}
              onInput={(event) => props.onTitleValueChange?.(event.currentTarget.value)}
              placeholder={props.titlePlaceholder ?? "Add a title for this crosspost"}
              value={props.titleValue ?? ""}
            />
          </div>

          <CrosspostSourcePreviewCard source={props.source} />
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-border-soft px-4 py-3 sm:px-5">
          <Type
            aria-hidden={props.submit?.error ? undefined : "true"}
            as="p"
            variant="caption"
            class={cn(!props.submit?.error && "invisible", "text-destructive-text")}
            role={props.submit?.error ? "alert" : undefined}
          >
            {submitError()}
          </Type>
          <Button
            disabled={props.submit?.disabled}
            loading={props.submit?.loading}
            onClick={props.submit?.onSubmit}
          >
            {props.submit?.label ?? "Post"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
