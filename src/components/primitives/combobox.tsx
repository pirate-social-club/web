"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, X } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

function Combobox<Value, Multiple extends boolean | undefined = false>(
  props: React.ComponentProps<typeof ComboboxPrimitive.Root<Value, Multiple>>,
) {
  return <ComboboxPrimitive.Root {...props} />;
}

const ComboboxInput = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Input>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-full border border-input bg-background px-4 py-2 text-base shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border-soft disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ComboboxInput.displayName = ComboboxPrimitive.Input.displayName;

const ComboboxChips = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Chips>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Chips>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Chips
    ref={ref}
    className={cn(
      "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-[var(--radius-2_5xl)] border border-input bg-background px-3 py-2 shadow-sm transition-[color,box-shadow,border-color] focus-within:border-border focus-within:ring-1 focus-within:ring-border-soft",
      className,
    )}
    {...props}
  />
));
ComboboxChips.displayName = ComboboxPrimitive.Chips.displayName;

const ComboboxChipsInput = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Input>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Input
    ref={ref}
    className={cn(
      "min-w-32 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground",
      className,
    )}
    {...props}
  />
));
ComboboxChipsInput.displayName = "ComboboxChipsInput";

const ComboboxChip = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Chip>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Chip>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.Chip
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 rounded-full border border-border-soft bg-muted px-3 py-1.5 text-base font-medium text-foreground",
      className,
    )}
    {...props}
  >
    <span className="truncate">{children}</span>
    <ComboboxPrimitive.ChipRemove
      className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Remove item"
    >
      <X className="size-3.5" />
    </ComboboxPrimitive.ChipRemove>
  </ComboboxPrimitive.Chip>
));
ComboboxChip.displayName = ComboboxPrimitive.Chip.displayName;

const ComboboxValue = ComboboxPrimitive.Value;

const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Popup>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Popup> &
    React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Positioner>
>(({ className, align = "start", sideOffset = 6, collisionPadding = 8, ...props }, ref) => (
  <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Positioner
      align={align}
      collisionPadding={collisionPadding}
      sideOffset={sideOffset}
    >
      <ComboboxPrimitive.Popup
        ref={ref}
        className={cn(
          "z-50 max-h-96 w-[var(--anchor-width)] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover text-popover-foreground shadow-md outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          className,
        )}
        {...props}
      />
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>
));
ComboboxContent.displayName = "ComboboxContent";

const ComboboxEmpty = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Empty
    ref={ref}
    className={cn("px-4 py-3 text-base text-muted-foreground", className)}
    {...props}
  />
));
ComboboxEmpty.displayName = ComboboxPrimitive.Empty.displayName;

const ComboboxList = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.List>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.List
    ref={ref}
    className={cn("max-h-80 overflow-y-auto py-1", className)}
    {...props}
  />
));
ComboboxList.displayName = ComboboxPrimitive.List.displayName;

const ComboboxItem = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center gap-3 px-4 py-2.5 text-base text-popover-foreground outline-none transition-colors data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <ComboboxPrimitive.ItemIndicator className="absolute start-2.5 flex size-5 items-center justify-center text-primary data-[selected=false]:hidden">
      <Check className="size-4" weight="bold" />
    </ComboboxPrimitive.ItemIndicator>
    <div className="min-w-0 flex-1 pl-6">{children}</div>
  </ComboboxPrimitive.Item>
));
ComboboxItem.displayName = ComboboxPrimitive.Item.displayName;

const ComboboxGroup = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Group>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Group ref={ref} className={cn("py-1", className)} {...props} />
));
ComboboxGroup.displayName = ComboboxPrimitive.Group.displayName;

const ComboboxLabel = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.GroupLabel>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.GroupLabel
    ref={ref}
    className={cn("px-4 py-2 text-base font-semibold text-foreground", className)}
    {...props}
  />
));
ComboboxLabel.displayName = ComboboxPrimitive.GroupLabel.displayName;

const ComboboxCollection = ComboboxPrimitive.Collection;
const ComboboxSeparator = ComboboxPrimitive.Separator;
const ComboboxTrigger = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <ComboboxPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 w-full items-center justify-between rounded-full border border-input bg-background px-4 py-2 text-base shadow-sm transition-[color,box-shadow,border-color] focus-visible:border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-soft disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground",
      className,
    )}
    {...props}
  >
    <span className="truncate">{children}</span>
    <span aria-hidden="true" className="ms-2 shrink-0 text-base text-muted-foreground">
      ▾
    </span>
  </ComboboxPrimitive.Trigger>
));
ComboboxTrigger.displayName = ComboboxPrimitive.Trigger.displayName;

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
};
