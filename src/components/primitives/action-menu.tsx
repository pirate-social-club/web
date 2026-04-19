"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { DotsThree } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { IconButton } from "./icon-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
  align?: React.ComponentProps<typeof DropdownMenuPrimitive.Content>["align"];
  contentClassName?: string;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: (key: string) => void;
}

export function ActionMenu({
  items,
  label = "Open menu",
  align = "end",
  contentClassName,
  triggerClassName,
  open,
  onOpenChange,
  onAction,
}: ActionMenuProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const resolvedOpen = open ?? mobileOpen;

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (!isControlled) {
      setMobileOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  if (items.length === 0) return null;

  if (isMobile) {
    return (
      <Sheet open={resolvedOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <IconButton
            aria-label={label}
            size="sm"
            variant="ghost"
            className={triggerClassName}
          >
            <DotsThree className="size-5" />
          </IconButton>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[var(--radius-xl)] px-0 pb-6 pt-4">
          <SheetHeader className="px-4 text-left">
            <SheetTitle className="text-base leading-[1.3]">Actions</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {items.map((item) => (
              <React.Fragment key={item.key}>
                {item.separatorBefore ? <div className="my-2 h-px bg-border" /> : null}
                <button
                  className={cn(
                    "grid w-full grid-cols-[1.25rem_1fr] items-center gap-3 px-4 py-3 text-left text-base leading-[1.35] text-foreground",
                    !item.icon && "grid-cols-[1fr]",
                    item.destructive && "text-destructive",
                    item.disabled && "pointer-events-none opacity-50",
                  )}
                  disabled={item.disabled}
                  onClick={() => {
                    onAction?.(item.key);
                    handleOpenChange(false);
                  }}
                  type="button"
                >
                  {item.icon ? (
                    <span className="inline-flex size-5 items-center justify-center">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenuPrimitive.Root open={resolvedOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild>
        <IconButton
          aria-label={label}
          size="sm"
          variant="ghost"
          className={triggerClassName}
        >
          <DotsThree className="size-5" />
        </IconButton>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={4}
          className={cn(
            "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover p-0 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            contentClassName,
          )}
        >
          {items.map((item) => (
            <React.Fragment key={item.key}>
              {item.separatorBefore ? (
                <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />
              ) : null}
              <DropdownMenuPrimitive.Item
                className={cn(
                  "relative w-full cursor-pointer select-none rounded-none py-2.5 pl-3 pr-3 text-base text-popover-foreground outline-none transition-colors hover:text-foreground focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  item.icon ? "grid grid-cols-[1.25rem_1fr] items-center gap-2" : "block",
                  item.destructive && "text-destructive focus:text-destructive",
                )}
                disabled={item.disabled}
                onClick={() => onAction?.(item.key)}
              >
                {item.icon ? (
                  <span className="inline-flex size-5 items-center justify-center">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </DropdownMenuPrimitive.Item>
            </React.Fragment>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
