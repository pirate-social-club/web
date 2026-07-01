"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";

import { AvailabilityCalendar } from "@/components/compositions/bookings/availability-calendar/availability-calendar";
import type { IanaTz, ResolvedSlot } from "@/components/compositions/bookings/view-models";

function formatUsd(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}

export interface ProfileBookPanelViewerProps {
  mode: "viewer";
  basePriceCents: number;
  slots: ResolvedSlot[];
  viewerTimezone: IanaTz;
  getSlotHref?: (slot: ResolvedSlot) => string;
  onSelectSlot: (slot: ResolvedSlot) => void;
  className?: string;
}

export interface ProfileBookPanelOwnerProps {
  mode: "owner";
  /** Whether the host has a set-up schedule (bookable-configured). false → setup prompt. */
  configured: boolean;
  basePriceCents: number;
  slots: ResolvedSlot[];
  viewerTimezone: IanaTz;
  onEdit: () => void;
  className?: string;
}

export type ProfileBookPanelProps = ProfileBookPanelViewerProps | ProfileBookPanelOwnerProps;

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
        {props.slots.length === 0 ? (
          <Type as="p" variant="caption" className="text-muted-foreground">{copy.bookNoAvailability}</Type>
        ) : (
          // Read-only for the owner (no slot tap).
          <AvailabilityCalendar slots={props.slots} viewerTimezone={props.viewerTimezone} />
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", props.className)}>
      <Type as="p" variant="body-strong">
        {copy.bookPriceLabel.replace("{price}", formatUsd(props.basePriceCents))}
      </Type>
      {props.slots.length === 0 ? (
        <Type as="p" variant="caption" className="text-muted-foreground">{copy.bookNoAvailability}</Type>
      ) : (
        <AvailabilityCalendar
          slots={props.slots}
          viewerTimezone={props.viewerTimezone}
          getSlotHref={props.getSlotHref}
          onSelectSlot={props.onSelectSlot}
        />
      )}
    </div>
  );
}
