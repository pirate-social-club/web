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
  onSelectSlot: (slot: ResolvedSlot) => void;
  className?: string;
}

export interface ProfileBookPanelOwnerProps {
  mode: "owner";
  /** true → live (Manage), false → not configured (Set up). */
  published: boolean;
  onManage: () => void;
  className?: string;
}

export type ProfileBookPanelProps = ProfileBookPanelViewerProps | ProfileBookPanelOwnerProps;

/**
 * Content of the profile "Book" tab. Presentational + controlled; the container supplies the
 * host's resolved slots (viewer) or the owner's publish state. No data fetching, no money — a
 * slot tap calls onSelectSlot, which the container routes into the existing checkout flow.
 */
export function ProfileBookPanel(props: ProfileBookPanelProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;

  if (props.mode === "owner") {
    return (
      <Card className={cn("space-y-4 border-border bg-card p-5 shadow-none", props.className)}>
        <Type as="p" variant="body" className="text-muted-foreground">
          {props.published ? copy.bookOwnerLiveNote : copy.bookOwnerSetupNote}
        </Type>
        <Button type="button" onClick={props.onManage}>
          {props.published ? copy.manageBookings : copy.setUpBookings}
        </Button>
      </Card>
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
          onSelectSlot={props.onSelectSlot}
        />
      )}
    </div>
  );
}
