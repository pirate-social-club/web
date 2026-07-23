"use client";

import * as React from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/primitives/sheet";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
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
  /** Availability could not be loaded. Kept distinct from a successful empty response. */
  error?: boolean;
  slots: ResolvedSlot[];
  /** Availability is still loading — show a loading hint instead of the empty state. */
  loading?: boolean;
  viewerTimezone: IanaTz;
  getSlotHref?: (slot: ResolvedSlot) => string;
  onRetry?: () => void;
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
  error,
  getSlotHref,
  loading,
  onRetry,
  onSelectSlot,
  slots,
  viewerTimezone,
}: FeedBookingContentProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  if (error) {
    return (
      <Card className="space-y-4 border-border bg-card p-5 shadow-none" role="alert">
        <Type as="p" variant="body">{copy.bookAvailabilityError}</Type>
        <Button onClick={onRetry} type="button">{copy.bookAvailabilityRetry}</Button>
      </Card>
    );
  }

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
