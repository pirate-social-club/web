"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

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

/**
 * Scheduling body shared by the feed dock and its mobile sheet fallback. Keeping the content
 * independent of either shell also lets stories and tests exercise availability states directly.
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
