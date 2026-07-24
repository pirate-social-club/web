"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";

import { IconButton } from "@/components/primitives/icon-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/primitives/sheet";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

// The 26rem dock shares the viewport with the 15.5rem app sidebar. Below xl that leaves too little
// room for the media stage, so tablet/small-desktop widths intentionally retain the bottom sheet.
export const FEED_DOCK_QUERY = "(min-width: 1280px)";

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
  | {
    kind: "booking";
    basePriceCents: number;
    handle: string;
    hostUserId: string;
    itemId: string;
    playback: {
      muted: boolean;
      paused: boolean;
      playbackSeconds: number;
    };
    sourceCommunityId: string | null;
  };

export function feedPanelBlocksPlayback(panel: FeedPanelState, itemId: string): boolean {
  return panel.kind === "booking" && panel.itemId === itemId;
}

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
    <div className={cn(
      "grid min-h-0 w-full grid-cols-1",
      panel && "xl:grid-cols-[minmax(0,1fr)_26rem]",
      className,
    )}>
      <div className="min-h-0 min-w-0">{children}</div>
      {panel}
    </div>
  );
}

export function FeedSidePanel({
  children,
  closeLabel,
  description,
  initialFocusRef,
  onOpenChange,
  open,
  returnFocusRef,
  title,
}: {
  children: React.ReactNode;
  closeLabel: string;
  description?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  title: string;
}) {
  const desktop = useFeedDockDesktop();
  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) returnFocusRef?.current?.focus();
  }, [onOpenChange, returnFocusRef]);

  React.useLayoutEffect(() => {
    if (open) initialFocusRef?.current?.focus();
  }, [initialFocusRef, open]);

  if (!open) return null;

  if (!desktop) {
    return (
      <Sheet onOpenChange={handleOpenChange} open>
        <SheetContent className="flex h-[88dvh] w-full flex-col overflow-hidden px-0 pb-[env(safe-area-inset-bottom)]" side="bottom">
          <SheetHeader className="shrink-0 px-5 text-start">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      aria-label={title}
      className="hidden min-h-0 border-s border-border-soft bg-card xl:flex xl:flex-col"
      data-feed-side-panel
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          handleOpenChange(false);
        }
      }}
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border-soft px-5">
        <div className="min-w-0">
          <Type as="h2" variant="h3">{title}</Type>
          {description ? <Type className="line-clamp-1" variant="caption">{description}</Type> : null}
        </div>
        <IconButton aria-label={closeLabel} onClick={() => handleOpenChange(false)} size="sm" variant="ghost">
          <X aria-hidden className="size-5" weight="bold" />
        </IconButton>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </aside>
  );
}
