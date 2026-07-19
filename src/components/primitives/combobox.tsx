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

function ComboboxInput({ className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Input>) {
  return (
    <ComboboxPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-full border border-input bg-background px-4 py-2 text-base shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border-soft disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChips({ className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Chips>) {
  return (
    <ComboboxPrimitive.Chips
      ref={ref}
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-[var(--radius-2_5xl)] border border-input bg-background px-3 py-2 shadow-sm transition-[color,box-shadow,border-color] focus-within:border-border focus-within:ring-1 focus-within:ring-border-soft",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChipsInput({ className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Input>) {
  return (
    <ComboboxPrimitive.Input
      ref={ref}
      className={cn(
        "min-w-32 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({ children, className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Chip>) {
  return (
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
  );
}

const ComboboxValue = ComboboxPrimitive.Value;

function ComboboxContent({
  align = "start",
  className,
  collisionPadding = 8,
  ref,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof ComboboxPrimitive.Popup> & React.ComponentProps<typeof ComboboxPrimitive.Positioner>) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        align={align}
        collisionPadding={collisionPadding}
        sideOffset={sideOffset}
      >
        <ComboboxPrimitive.Popup
          ref={ref}
          className={cn(
            "z-50 w-[var(--anchor-width)] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover text-popover-foreground shadow-md outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxEmpty({ className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Empty>) {
  return (
    <ComboboxPrimitive.Empty
      ref={ref}
      className={cn("px-4 py-3 text-base text-muted-foreground empty:hidden", className)}
      {...props}
    />
  );
}

function ComboboxList({ className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.List>) {
  return (
    <ComboboxPrimitive.List
      ref={ref}
      className={cn("max-h-80 overflow-y-auto py-0", className)}
      {...props}
    />
  );
}

function ComboboxItem({ children, className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Item>) {
  return (
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
      <div className="min-w-0 flex-1 ps-6">{children}</div>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Group>) {
  return <ComboboxPrimitive.Group ref={ref} className={cn("py-1", className)} {...props} />;
}

function ComboboxLabel({ className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.GroupLabel>) {
  return (
    <ComboboxPrimitive.GroupLabel
      ref={ref}
      className={cn("px-4 py-2 text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

const ComboboxCollection = ComboboxPrimitive.Collection;
const ComboboxSeparator = ComboboxPrimitive.Separator;
function ComboboxTrigger({ children, className, ref, ...props }: React.ComponentProps<typeof ComboboxPrimitive.Trigger>) {
  return (
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
  );
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,

  ComboboxContent,
  ComboboxEmpty,

  ComboboxInput,
  ComboboxItem,

  ComboboxList,

  ComboboxTrigger,
  ComboboxValue,
};
