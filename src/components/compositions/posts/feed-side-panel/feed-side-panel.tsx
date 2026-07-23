"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";

import { IconButton } from "@/components/primitives/icon-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/primitives/sheet";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

const FEED_DOCK_QUERY = "(min-width: 1024px)";

function useFeedDockDesktop(): boolean {
  return React.useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(FEED_DOCK_QUERY);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia(FEED_DOCK_QUERY).matches,
    () => false,
  );
}

export type FeedPanelState =
  | { kind: "none" }
  | { kind: "comments"; itemId: string; postId: string }
  | { kind: "booking"; basePriceCents: number; hostUserId: string; itemId: string };

export function FeedPanelLayout({
  children,
  className,
  panel,
}: {
  children: React.ReactNode;
  className?: string;
  panel?: React.ReactNode;
}) {
  return (
    <div className={cn("grid min-h-0 w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_26rem]", className)}>
      <div className="min-h-0 min-w-0">{children}</div>
      {panel}
    </div>
  );
}

export function FeedSidePanel({
  children,
  closeLabel,
  description,
  onOpenChange,
  open,
  title,
}: {
  children: React.ReactNode;
  closeLabel: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  const desktop = useFeedDockDesktop();

  if (!open) return null;

  if (!desktop) {
    return (
      <Sheet onOpenChange={onOpenChange} open>
        <SheetContent className="flex h-[88dvh] w-full flex-col overflow-hidden px-0 pb-[env(safe-area-inset-bottom)]" side="bottom">
          <SheetHeader className="shrink-0 px-5 text-start">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      aria-label={title}
      className="hidden min-h-0 border-s border-border-soft bg-card lg:flex lg:flex-col"
      data-feed-side-panel
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onOpenChange(false);
        }
      }}
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border-soft px-5">
        <div className="min-w-0">
          <Type as="h2" variant="h3">{title}</Type>
          {description ? <Type className="line-clamp-1" variant="caption">{description}</Type> : null}
        </div>
        <IconButton aria-label={closeLabel} onClick={() => onOpenChange(false)} size="sm" variant="ghost">
          <X aria-hidden className="size-5" weight="bold" />
        </IconButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
