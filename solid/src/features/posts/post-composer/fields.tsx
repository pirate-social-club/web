// Shared composer field primitives, ported from the React
// post-composer-fields.tsx (ShellPill, FieldLabel, UploadField,
// LabeledTextarea). The desktop community picker uses the DS DropdownMenu;
// the mobile picker uses the DS Sheet, same as React.

import { createMemo, createSignal, For, Show, type ParentProps } from "solid-js";
import type { JSX } from "@solidjs/web";

import {
  CommunityAvatar,
  createIsMobile,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormFieldLabel,
  IconCaretDown,
  IconImage,
  IconUsers,
  IconX,
  Input,
  PillButton,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Textarea,
  Type,
} from "../../../design-system";
import { cn } from "../../../design-system";
import type { CommunityPickerItem } from "./types";

export type { CommunityPickerItem } from "./types";

export function ShellPill(props: ParentProps<{
  avatarSrc?: string;
  class?: string;
  communities?: CommunityPickerItem[];
  emptyLabel?: string;
  onSelectCommunity?: (communityId: string) => void;
  onSearchQueryChange?: (query: string) => void;
  pickerSearchPlaceholder?: string;
  pickerTitle?: string;
}>) {
  const isMobile = createIsMobile();
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const pickerSearchPlaceholder = () => props.pickerSearchPlaceholder ?? "Search communities";
  const pickerTitle = () => props.pickerTitle ?? "Choose a community";

  const handleQueryChange = (next: string) => {
    setQuery(next);
    props.onSearchQueryChange?.(next);
  };

  const TriggerContent = () => (
    <>
      <Show
        when={props.avatarSrc}
        fallback={
          <div class="grid size-8 place-items-center rounded-full bg-background text-muted-foreground">
            <IconUsers class="size-5" />
          </div>
        }
      >
        {(src) => <img alt="" class="size-8 rounded-full object-cover" src={src()} />}
      </Show>
      <span class="min-w-0 flex-1 truncate text-start">{props.children}</span>
      <IconCaretDown class="size-4 shrink-0 text-muted-foreground" />
    </>
  );

  const filteredCommunities = createMemo(() => {
    const normalizedQuery = query().trim().toLocaleLowerCase();
    if (!props.communities || normalizedQuery.length === 0) return props.communities ?? [];
    return props.communities.filter((community) =>
      community.displayName.toLocaleLowerCase().includes(normalizedQuery),
    );
  });

  return (
    <Show
      when={props.communities && props.onSelectCommunity}
      fallback={
        <PillButton
          aria-disabled="true"
          aria-label={pickerTitle()}
          class={cn("h-14 max-w-full justify-start gap-3 px-3.5 text-foreground", props.class)}
          tabindex={-1}
          tone="default"
        >
          <TriggerContent />
        </PillButton>
      }
    >
      <Show
        when={!isMobile()}
        fallback={
          <Sheet open={mobileOpen()} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label={pickerTitle()}
              class={cn("h-14 max-w-full justify-start gap-3 px-3.5 text-foreground inline-flex items-center rounded-full", props.class)}
            >
              <TriggerContent />
            </SheetTrigger>
            <SheetContent class="flex max-h-[75dvh] flex-col rounded-t-[var(--radius-3xl)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4" side="bottom">
              <div aria-hidden="true" class="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />
              <SheetHeader class="pe-12 text-start">
                <SheetTitle>{pickerTitle()}</SheetTitle>
              </SheetHeader>
              <Input
                aria-label={pickerTitle()}
                class="mt-5 h-12"
                onInput={(event) => handleQueryChange(event.currentTarget.value)}
                placeholder={pickerSearchPlaceholder()}
                value={query()}
              />
              <div class="-mx-4 mt-4 min-h-0 flex-1 overflow-y-auto border-t border-border-soft">
                <Show
                  when={filteredCommunities().length > 0}
                  fallback={
                    <Type as="div" variant="caption" class="px-4 py-5">
                      {props.emptyLabel ?? "No recent communities."}
                    </Type>
                  }
                >
                  <For each={filteredCommunities()}>
                    {(community) => (
                      <button
                        class="grid w-full grid-cols-[2.75rem_1fr] items-center gap-3 border-b border-border-soft px-4 py-3 text-start text-base text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                          props.onSelectCommunity?.(community.communityId);
                          setMobileOpen(false);
                          handleQueryChange("");
                        }}
                        type="button"
                      >
                        <CommunityAvatar
                          avatarSrc={community.avatarSrc}
                          class="size-11 bg-card text-base"
                          communityId={community.communityId}
                          displayName={community.displayName}
                          size="sm"
                        />
                        <span class="truncate">{community.displayName}</span>
                      </button>
                    )}
                  </For>
                </Show>
              </div>
            </SheetContent>
          </Sheet>
        }
      >
        <DropdownMenu gutter={4} placement="bottom-start">
          <DropdownMenuTrigger
            aria-label={pickerTitle()}
            class={cn("h-11 max-w-full justify-start gap-3 px-3.5 text-foreground inline-flex items-center rounded-full", props.class)}
          >
            <TriggerContent />
          </DropdownMenuTrigger>
          <DropdownMenuContent class="max-h-96 min-w-48">
            <Show
              when={(props.communities ?? []).length > 0}
              fallback={
                <div class="px-3 py-4 text-muted-foreground">
                  {props.emptyLabel ?? "No recent communities."}
                </div>
              }
            >
              <Show when={props.onSearchQueryChange}>
                <div class="border-b border-border-soft p-2">
                  <Input
                    aria-label={pickerTitle()}
                    class="h-10"
                    onInput={(event) => handleQueryChange(event.currentTarget.value)}
                    placeholder={pickerSearchPlaceholder()}
                    value={query()}
                  />
                </div>
              </Show>
              <For each={filteredCommunities()}>
                {(community) => (
                  <DropdownMenuItem
                    class="grid w-full grid-cols-[2.25rem_1fr] items-center gap-3 px-3 py-2.5"
                    onSelect={() => props.onSelectCommunity?.(community.communityId)}
                  >
                    <CommunityAvatar
                      avatarSrc={community.avatarSrc}
                      class="size-9 bg-card text-base"
                      communityId={community.communityId}
                      displayName={community.displayName}
                      size="sm"
                    />
                    <span class="truncate">{community.displayName}</span>
                  </DropdownMenuItem>
                )}
              </For>
            </Show>
          </DropdownMenuContent>
        </DropdownMenu>
      </Show>
    </Show>
  );
}

export function FieldLabel(props: {
  label: string;
  counter?: string;
  class?: string;
  labelClass?: string;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <FormFieldLabel
      class={cn("mb-2", props.class)}
      counter={props.counter}
      htmlFor={props.htmlFor}
      label={props.label}
      labelClass={props.labelClass}
      required={props.required}
    />
  );
}

export function UploadField(props: {
  label: string;
  accept: string;
  artworkHelp?: string;
  artworkPlaceholderLabel?: string;
  artworkPreviewAspect?: "square" | "video";
  chooseFileLabel?: string;
  replaceLabel?: string;
  coverLabel?: string;
  noFileSelectedLabel?: string;
  squareArtworkLabel?: string;
  uploadArtworkHelp?: string;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  onClear?: () => void;
  placeholderLabel?: string;
  previewUrl?: string;
  required?: boolean;
  selectedLabel?: string;
  variant?: "default" | "artwork";
}) {
  const inputId = `upload-${props.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  let inputRef: HTMLInputElement | undefined;
  const isArtwork = () => props.variant === "artwork";
  const showClear = () => Boolean(props.selectedLabel && props.onClear);

  return (
    <div class="block">
      <FieldLabel htmlFor={inputId} label={props.label} required={props.required} />
      <div class="flex items-stretch gap-2">
        <input
          accept={props.accept}
          class="sr-only"
          id={inputId}
          multiple={props.multiple ?? false}
          onChange={(event) => {
            props.onChange?.(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
          ref={inputRef}
          required={props.required}
          type="file"
        />
        <label
          class={cn(
            "flex min-w-0 flex-1 cursor-pointer rounded-[var(--radius-lg)] border border-border-soft bg-background transition-colors hover:border-primary/40",
            isArtwork() ? "items-center gap-4 p-4" : "items-center justify-between gap-4 px-4 py-3.5",
          )}
          for={inputId}
        >
          <Show
            when={isArtwork()}
            fallback={
              <div class="min-w-0">
                <p class="truncate text-base font-semibold text-foreground">
                  {props.selectedLabel || props.placeholderLabel || props.noFileSelectedLabel || "No file selected"}
                </p>
              </div>
            }
          >
            <div
              class={cn(
                "grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-muted",
                props.artworkPreviewAspect === "video" ? "aspect-video w-32" : "size-24",
              )}
            >
              <Show
                when={props.previewUrl}
                fallback={
                  <Show
                    when={props.selectedLabel}
                    fallback={<IconImage class="size-8 text-muted-foreground" />}
                  >
                    <span class="px-3 text-center text-base font-semibold text-foreground">
                      {props.coverLabel ?? "Cover"}
                    </span>
                  </Show>
                }
              >
                {(url) => <img alt="" class="size-full rounded-[var(--radius-lg)] object-cover" src={url()} />}
              </Show>
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <p class="truncate text-base font-semibold text-foreground">
                {props.selectedLabel || props.artworkPlaceholderLabel || props.squareArtworkLabel || "Upload square artwork"}
              </p>
              <p class="text-base text-muted-foreground">
                {props.artworkHelp || props.uploadArtworkHelp || "Shows in feed, release, and player surfaces."}
              </p>
            </div>
          </Show>
          <span class="inline-flex shrink-0 items-center rounded-full bg-muted px-3.5 py-2 text-base font-semibold text-foreground">
            {props.selectedLabel ? (props.replaceLabel ?? "Replace") : (props.chooseFileLabel ?? "Choose file")}
          </span>
        </label>
        <Show when={showClear()}>
          <button
            aria-label={`Remove ${props.label.toLowerCase()}`}
            class="grid w-12 shrink-0 place-items-center rounded-full border border-border-soft bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            onClick={() => {
              if (inputRef) inputRef.value = "";
              props.onClear?.();
            }}
            type="button"
          >
            <IconX class="size-5" />
          </button>
        </Show>
      </div>
    </div>
  );
}

export function LabeledTextarea(props: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  class?: string;
  labelClass?: string;
  labelTextClass?: string;
  variant?: "default" | "flat";
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <div>
      <FieldLabel
        class={props.labelClass}
        htmlFor={props.htmlFor}
        label={props.label}
        labelClass={props.labelTextClass}
        required={props.required}
      />
      <Textarea
        class={props.class}
        id={props.htmlFor}
        onInput={(event) => props.onChange?.(event.currentTarget.value)}
        placeholder={props.placeholder}
        required={props.required}
        variant={props.variant}
        value={props.value}
      />
    </div>
  );
}
