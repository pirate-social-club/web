"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import {
  formatCentsAsStartingUsd,
  formatTzLabel,
  getSlotUniformity,
} from "@/components/compositions/bookings/fixtures/bookings-format";

import { AvailabilityCalendar } from "@/components/compositions/bookings/availability-calendar/availability-calendar";
import type { IanaTz, ResolvedSlot } from "@/components/compositions/bookings/view-models";

interface ProfileBookPanelViewerProps {
  mode: "viewer";
  /** Canonical cheapest currently bookable slot, already resolved by the server/feed. */
  startingPriceCents: number;
  slots: ResolvedSlot[];
  /** Availability is still loading — show a loading hint instead of the empty state. */
  loading?: boolean;
  viewerTimezone: IanaTz;
  getSlotHref?: (slot: ResolvedSlot) => string;
  onSelectSlot: (slot: ResolvedSlot, event?: React.MouseEvent) => void;
  className?: string;
}

interface ProfileBookPanelOwnerProps {
  mode: "owner";
  /** Whether the host has a set-up schedule (bookable-configured). false → setup prompt. */
  configured: boolean;
  basePriceCents: number;
  slots: ResolvedSlot[];
  /** Availability is still loading — show a loading hint instead of the empty state. */
  loading?: boolean;
  viewerTimezone: IanaTz;
  onEdit: () => void;
  className?: string;
}

export type ProfileBookPanelProps = ProfileBookPanelViewerProps | ProfileBookPanelOwnerProps;

/**
 * The one place duration/price/timezone are stated — slot chips stay time-only. When slots
 * are uniform the exact shared values appear ("30 min · $50 · Times in Tbilisi"); when prices
 * vary, a "from" price stands in and each chip carries its own price instead.
 */
function sessionFactsLine(
  bookTimesInTemplate: string,
  slots: ResolvedSlot[],
  viewerTimezone: IanaTz,
  fallbackPriceCents: number,
): string {
  const uniformity = getSlotUniformity(slots);
  const pricePart = uniformity.priceLabel
    ?? (fallbackPriceCents > 0 ? formatCentsAsStartingUsd(fallbackPriceCents) : null);
  return [
    uniformity.durationLabel,
    pricePart,
    bookTimesInTemplate.replace("{timezone}", formatTzLabel(viewerTimezone)),
  ].filter(Boolean).join(" · ");
}

/**
 * Content of the profile "Calendar" tab. Presentational + controlled; the container supplies the
 * host's resolved slots. Owner sees their real availability (read-only) + an Edit-schedule action;
 * viewer sees availability + price and a slot tap → checkout. No data fetching, no money here.
 */
export function ProfileBookPanel(props: ProfileBookPanelProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  if (props.mode === "owner") {
    if (!props.configured) {
      return (
        <Card className={cn("space-y-4 border-border bg-card p-5 shadow-none", props.className)}>
          <Type as="p" variant="body" className="text-muted-foreground">{copy.ownerSetupPrompt}</Type>
          <Button type="button" onClick={props.onEdit}>{copy.setUpBookings}</Button>
        </Card>
      );
    }
    return (
      <div className={cn("space-y-4", props.className)}>
        <div className="flex items-center justify-between gap-3">
          <Type as="p" variant="body-strong">{copy.ownerAvailabilityTitle}</Type>
          <Button variant="outline" size="sm" type="button" onClick={props.onEdit}>{copy.editSchedule}</Button>
        </div>
        {props.loading ? (
          <Type as="p" variant="caption" className="text-muted-foreground">Loading availability…</Type>
        ) : props.slots.length === 0 ? (
          <Type as="p" variant="caption" className="text-muted-foreground">{copy.bookNoAvailability}</Type>
        ) : (
          <>
            <Type as="p" variant="caption" className="text-muted-foreground">
              {sessionFactsLine(copy.bookTimesIn, props.slots, props.viewerTimezone, props.basePriceCents)}
            </Type>
            {/* Read-only for the owner (no slot tap). */}
            <AvailabilityCalendar slots={props.slots} viewerTimezone={props.viewerTimezone} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", props.className)}>
      {props.loading ? (
        <Type as="p" variant="caption" className="text-muted-foreground">Loading availability…</Type>
      ) : props.slots.length === 0 ? (
        <Type as="p" variant="caption" className="text-muted-foreground">{copy.bookNoAvailability}</Type>
      ) : (
        <>
          <Type as="p" variant="body-strong">
            {sessionFactsLine(copy.bookTimesIn, props.slots, props.viewerTimezone, props.startingPriceCents)}
          </Type>
          <AvailabilityCalendar
            className="min-h-0 flex-1"
            slots={props.slots}
            viewerTimezone={props.viewerTimezone}
            getSlotHref={props.getSlotHref}
            onSelectSlot={props.onSelectSlot}
          />
        </>
      )}
    </div>
  );
}
