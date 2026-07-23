"use client";

import * as React from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/primitives/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

import { ProfileBookPanel } from "@/components/compositions/bookings/profile-book-panel/profile-book-panel";
import type { IanaTz, ResolvedSlot } from "@/components/compositions/bookings/view-models";

/** Fills the localized "Book {handle}" template. Exported so the substitution stays under test. */
export function formatFeedBookingTitle(template: string, handle: string): string {
  return template.replace("{handle}", handle);
}

interface FeedBookingContentProps {
  basePriceCents: number;
  slots: ResolvedSlot[];
  /** Availability is still loading — show a loading hint instead of the empty state. */
  loading?: boolean;
  viewerTimezone: IanaTz;
  getSlotHref?: (slot: ResolvedSlot) => string;
  onSelectSlot: (slot: ResolvedSlot, event?: React.MouseEvent) => void;
}

export interface FeedBookingSheetProps extends FeedBookingContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Publisher being booked, used for the sheet title. */
  handle: string;
  className?: string;
}

/**
 * Scheduling body. Split from the sheet shell so it can be rendered — and tested — without the
 * Radix dialog context, which needs DOM APIs the test runtime does not provide.
 */
export function FeedBookingSheetBody({
  basePriceCents,
  getSlotHref,
  loading,
  onSelectSlot,
  slots,
  viewerTimezone,
}: FeedBookingContentProps) {
  return (
    <ProfileBookPanel
      basePriceCents={basePriceCents}
      getSlotHref={getSlotHref}
      loading={loading}
      mode="viewer"
      onSelectSlot={onSelectSlot}
      slots={slots}
      viewerTimezone={viewerTimezone}
    />
  );
}

/**
 * Scheduling overlay for the video feed. Presentational + controlled: the container supplies the
 * host's resolved slots and decides what a slot tap does (typically navigate to checkout).
 *
 * Docks to the right on desktop and rises as a near-full-height bottom sheet on mobile, so the
 * viewer keeps the video in view instead of losing the feed to a route change.
 */
export function FeedBookingSheet({
  className,
  handle,
  onOpenChange,
  open,
  ...content
}: FeedBookingSheetProps) {
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  const title = formatFeedBookingTitle(copy.bookSheetTitle, handle);

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className={cn(
          "flex flex-col gap-4 overflow-y-auto",
          isMobile ? "h-[88dvh] w-full" : "w-full sm:max-w-md",
          className,
        )}
        side={isMobile ? "bottom" : "right"}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{copy.bookSheetDescription}</SheetDescription>
        </SheetHeader>
        <FeedBookingSheetBody {...content} />
      </SheetContent>
    </Sheet>
  );
}
