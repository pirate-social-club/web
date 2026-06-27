import * as React from "react";

import { Avatar } from "@/components/primitives/avatar";
import { Card, CardContent } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { BookingState, IanaTz, IsoInstant } from "@pirate/bookings-domain";

import {
  formatBookingDate,
  formatCentsAsUsd,
  formatSlotTime,
} from "../fixtures/bookings-format";

export interface BookingListItem {
  id: string;
  hostName: string;
  hostPhotoSrc: string;
  startUtc: IsoInstant;
  endUtc: IsoInstant;
  state: BookingState;
  priceCents: number;
}

export interface BookingsListProps {
  items: BookingListItem[];
  viewerTimezone: IanaTz;
  onSelectBooking?: (item: BookingListItem) => void;
  className?: string;
}

function stateLabel(state: BookingState): string {
  switch (state) {
    case "hold":
      return "Slot held";
    case "quoted":
      return "Quote ready";
    case "pending_payment":
      return "Payment verifying";
    case "confirmed":
      return "Confirmed";
    case "live":
      return "In progress";
    case "completed":
      return "Completed";
    case "settled":
      return "Settled";
    case "expired_hold":
      return "Hold expired";
    case "cancelled_before_payment":
      return "Cancelled";
    case "cancelled_by_host":
      return "Cancelled by host";
    case "cancelled_by_booker":
      return "Cancelled";
    case "no_show_host":
      return "Host no-show";
    case "no_show_booker":
      return "No-show";
    case "refunded":
      return "Refunded";
    case "disputed":
      return "Under review";
  }
}

export function BookingsList({ items, viewerTimezone, onSelectBooking, className }: BookingsListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Type variant="caption">No bookings yet.</Type>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4 text-left transition-colors hover:bg-card/85"
          onClick={() => onSelectBooking?.(item)}
          type="button"
        >
          <Avatar fallback={item.hostName} src={item.hostPhotoSrc} />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Type variant="body-strong">{item.hostName}</Type>
              <Type variant="body-strong">{formatCentsAsUsd(item.priceCents)}</Type>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Type variant="caption">
                {formatBookingDate(item.startUtc, viewerTimezone)} at{" "}
                {formatSlotTime(item.startUtc, viewerTimezone)}
              </Type>
              <Type variant="caption">{stateLabel(item.state)}</Type>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
