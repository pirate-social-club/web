import * as React from "react";
import {
  CaretDown,
  Image as ImageIcon,
  Users,
} from "@phosphor-icons/react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CommunityAvatar } from "@/components/primitives/community-avatar";
import { FormattedTextarea } from "@/components/primitives/formatted-textarea";
import { FormFieldLabel } from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { PillButton } from "@/components/primitives/pill-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/primitives/sheet";
import { Textarea } from "@/components/primitives/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { CommunityPickerItem } from "./post-composer.types";
import { Type } from "@/components/primitives/type";

export type { CommunityPickerItem } from "./post-composer.types";

export function ShellPill({
  avatarSrc,
  children,
  className,
  communities,
  emptyLabel,
  onSelectCommunity,
  pickerSearchPlaceholder = "Search communities",
  pickerTitle = "Choose a community",
}: {
  avatarSrc?: string;
  children: React.ReactNode;
  className?: string;
  communities?: CommunityPickerItem[];
  emptyLabel?: string;
  onSelectCommunity?: (communityId: string) => void;
  pickerSearchPlaceholder?: string;
  pickerTitle?: string;
}) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerContent = (
    <>
      {avatarSrc ? (
        <img alt="" className="size-8 rounded-full object-cover" src={avatarSrc} />
      ) : (
        <div className="grid size-8 place-items-center rounded-full bg-background text-muted-foreground">
          <Users className="size-5" />
        </div>
      )}
      <span className="min-w-0 flex-1 truncate text-start">{children}</span>
      <CaretDown className="size-4 shrink-0 text-muted-foreground" weight="bold" />
    </>
  );
  const filteredCommunities = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!communities || normalizedQuery.length === 0) return communities ?? [];
    return communities.filter((community) =>
      community.displayName.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [communities, query]);

  if (!communities || !onSelectCommunity) {
    return (
      <PillButton
        aria-label={pickerTitle}
        aria-disabled="true"
        className={cn("h-14 max-w-full justify-start gap-3 px-3.5 text-foreground", className)}
        tabIndex={-1}
        tone="default"
      >
        {triggerContent}
      </PillButton>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <PillButton
            aria-label={pickerTitle}
            className={cn("h-14 max-w-full justify-start gap-3 px-3.5 text-foreground", className)}
            tone="default"
          >
            {triggerContent}
          </PillButton>
        </SheetTrigger>
        <SheetContent className="flex max-h-[75dvh] flex-col rounded-t-[var(--radius-3xl)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4" side="bottom">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" aria-hidden="true" />
          <SheetHeader className="pe-12 text-start">
            <SheetTitle>{pickerTitle}</SheetTitle>
          </SheetHeader>
          <Input
            aria-label={pickerTitle}
            className="mt-5 h-12"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={pickerSearchPlaceholder}
            value={query}
          />
          <div className="-mx-4 mt-4 min-h-0 flex-1 overflow-y-auto border-t border-border-soft">
            {filteredCommunities.length === 0 ? (
              <Type as="div" variant="caption" className="px-4 py-5">
                {emptyLabel ?? "No recent communities."}
              </Type>
            ) : (
              filteredCommunities.map((community) => (
                <button
                  className="grid w-full grid-cols-[2.75rem_1fr] items-center gap-3 border-b border-border-soft px-4 py-3 text-start text-base text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  key={community.communityId}
                  onClick={() => {
                    onSelectCommunity(community.communityId);
                    setMobileOpen(false);
                    setQuery("");
                  }}
                  type="button"
                >
                  <CommunityAvatar
                    className="h-11 w-11 bg-card text-base"
                    avatarSrc={community.avatarSrc}
                    communityId={community.communityId}
                    displayName={community.displayName}
                    size="sm"
                  />
                  <span className="truncate">{community.displayName}</span>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <PillButton
          aria-label={pickerTitle}
          className={cn("h-11 max-w-full justify-start gap-3 px-3.5 text-foreground", className)}
          tone="default"
        >
          {triggerContent}
        </PillButton>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "relative z-50 max-h-96 w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover p-0 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out",
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
                <CommunityAvatar
                  className="h-9 w-9 bg-card text-base"
                  avatarSrc={community.avatarSrc}
                  communityId={community.communityId}
                  displayName={community.displayName}
                  size="sm"
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
  className,
  labelClassName,
}: {
  label: string;
  counter?: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <FormFieldLabel
      className={cn("mb-2", className)}
      counter={counter}
      label={label}
      labelClassName={labelClassName}
    />
  );
}

export function UploadField({
  label,
  accept,
  copy,
  multiple = false,
  onChange,
  placeholderLabel,
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
  placeholderLabel?: string;
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
              {selectedLabel || placeholderLabel || copy.upload.noFileSelected}
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
  labelClassName,
  labelTextClassName,
  variant,
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  labelClassName?: string;
  labelTextClassName?: string;
  variant?: React.ComponentProps<typeof Textarea>["variant"];
}) {
  return (
    <div>
      <FieldLabel className={labelClassName} label={label} labelClassName={labelTextClassName} />
      <Textarea
        className={className}
        defaultValue={value == null ? defaultValue : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        variant={variant}
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
  variant = "default",
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "default" | "flat";
}) {
  return (
    <Textarea
      className={cn("min-h-44", className)}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      variant={variant}
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
            {title ? <Type as="p" variant="body-strong" className="line-clamp-2 ">{title}</Type> : null}
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
