import * as React from "react";
import {
  CaretDown,
  Image as ImageIcon,
  Tag,
} from "@phosphor-icons/react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Avatar } from "@/components/primitives/avatar";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/utils";
import type { CommunityPickerItem } from "./post-composer.types";

export type { CommunityPickerItem } from "./post-composer.types";

export function ShellPill({
  avatarSrc,
  children,
  communities,
  emptyLabel,
  onSelectCommunity,
}: {
  avatarSrc?: string;
  children: React.ReactNode;
  communities?: CommunityPickerItem[];
  emptyLabel?: string;
  onSelectCommunity?: (communityId: string) => void;
}) {
  if (!communities || !onSelectCommunity) {
    return (
      <div className="inline-flex items-center gap-3 rounded-full bg-muted px-3.5 py-2.5 text-base font-semibold text-foreground">
        {avatarSrc ? (
          <img alt="" className="size-8 rounded-full object-cover" src={avatarSrc} />
        ) : (
          <div className="grid size-8 place-items-center rounded-full bg-background text-muted-foreground">
            <Tag className="size-5" />
          </div>
        )}
        <span>{children}</span>
        <CaretDown className="size-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          className="inline-flex items-center gap-3 rounded-full bg-muted px-3.5 py-2.5 text-base font-semibold text-foreground outline-none transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          {avatarSrc ? (
            <img alt="" className="size-8 rounded-full object-cover" src={avatarSrc} />
          ) : (
            <div className="grid size-8 place-items-center rounded-full bg-background text-muted-foreground">
              <Tag className="size-5" />
            </div>
          )}
          <span>{children}</span>
          <CaretDown className="size-5 text-muted-foreground" />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "relative z-50 max-h-96 min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover p-0 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          )}
        >
          {communities.length === 0 ? (
            <div className="px-3 py-4 text-muted-foreground">
              {emptyLabel ?? "No recent communities."}
            </div>
          ) : (
            communities.map((community) => (
              <DropdownMenuPrimitive.Item
                className="grid w-full cursor-pointer select-none grid-cols-[2.25rem_1fr] items-center gap-3 px-3 py-2.5 text-base text-popover-foreground outline-none transition-colors hover:bg-muted focus:bg-muted"
                key={community.communityId}
                onClick={() => onSelectCommunity(community.communityId)}
                textValue={community.displayName}
              >
                <Avatar
                  className="h-9 w-9 bg-card text-base"
                  fallback={community.displayName.slice(0, 2).toUpperCase()}
                  size="sm"
                  src={community.avatarSrc ?? undefined}
                />
                <span className="truncate">{community.displayName}</span>
              </DropdownMenuPrimitive.Item>
            ))
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export function FieldLabel({
  label,
  counter,
}: {
  label: string;
  counter?: string;
}) {
  return <FormFieldLabel className="mb-2" counter={counter} label={label} />;
}

export function UploadField({
  label,
  accept,
  copy,
  multiple = false,
  onChange,
  selectedLabel,
  variant = "default",
}: {
  label: string;
  accept: string;
  copy: {
    buttons: Record<string, string>;
    upload: Record<string, string>;
  };
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  selectedLabel?: string;
  variant?: "default" | "artwork";
}) {
  const inputId = React.useId();
  const isArtwork = variant === "artwork";

  return (
    <div className="block">
      <FieldLabel label={label} />
      <input
        id={inputId}
        accept={accept}
        className="sr-only"
        multiple={multiple}
        onChange={(event) => onChange?.(event.target.files)}
        type="file"
      />
      <label
        className={cn(
          "flex w-full cursor-pointer rounded-[var(--radius-lg)] border border-border-soft bg-background transition-colors hover:border-primary/40",
          isArtwork ? "items-center gap-4 px-4 py-4" : "items-center justify-between gap-4 px-4 py-3.5",
        )}
        htmlFor={inputId}
      >
        {isArtwork ? (
          <>
            <div className="grid size-24 shrink-0 place-items-center rounded-[var(--radius-lg)] border border-border-soft bg-muted">
              {selectedLabel ? (
                <span className="px-3 text-center text-base font-semibold text-foreground">
                  {copy.upload.cover}
                </span>
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-base font-semibold text-foreground">
                {selectedLabel || copy.upload.squareArtwork}
              </p>
              <p className="text-base text-muted-foreground">
                {copy.upload.artworkHelp}
              </p>
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {selectedLabel || copy.upload.noFileSelected}
            </p>
          </div>
        )}
        <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-3.5 py-2 text-base font-semibold text-foreground">
          {selectedLabel ? copy.buttons.replace : copy.buttons.chooseFile}
        </span>
      </label>
    </div>
  );
}

export function LabeledTextarea({
  label,
  placeholder,
  defaultValue,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <Textarea
        className={className}
        defaultValue={value == null ? defaultValue : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

export function LabeledFormattedTextarea({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <FormattedTextarea
        className={className}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

export function EditorChrome({
  value,
  onChange,
  placeholder = "Write your post",
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FormattedTextarea
      className={cn("min-h-44", className)}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}

export function LinkPreviewCard({
  domain,
  title,
  imageSrc,
}: {
  domain: string;
  title?: string;
  imageSrc?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-card">
      <div
        className={cn(
          "grid min-h-16 items-stretch gap-3",
          imageSrc ? "grid-cols-[minmax(0,7fr)_minmax(5rem,3fr)]" : "grid-cols-1",
        )}
      >
        <div className="flex min-h-20 min-w-0 items-center px-4 py-3">
          <div className="min-w-0 space-y-1">
            {title ? <p className="line-clamp-2 text-base font-semibold text-foreground">{title}</p> : null}
            <p className="truncate text-base text-muted-foreground">{domain}</p>
          </div>
        </div>
        {imageSrc ? (
          <img
            alt=""
            aria-hidden="true"
            className="size-full min-h-20 object-cover"
            src={imageSrc}
          />
        ) : null}
      </div>
    </div>
  );
}
