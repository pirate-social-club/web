import * as React from "react";

import { Card, CardContent } from "@/components/primitives/card";
import { Separator } from "@/components/primitives/separator";
import { Type } from "@/components/primitives/type";
import type { BookingQuotePreview, IanaTz } from "../view-models";

import {
  formatCentsAsUsd,
  formatBookingDate,
  formatSlotDuration,
  formatSlotTime,
  formatTzLabel,
} from "../fixtures/bookings-format";

export interface BookingSummaryProps {
  quote: BookingQuotePreview;
  viewerTimezone: IanaTz;
  className?: string;
}

export function BookingSummary({ quote, viewerTimezone, className }: BookingSummaryProps) {
  const { slot, grossCents, platformFeeCents, hostPayoutCents } = quote;
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <Type variant="label">Session</Type>
          <Type variant="body-strong">
            {formatBookingDate(slot.startUtc, viewerTimezone)} at{" "}
            {formatSlotTime(slot.startUtc, viewerTimezone)}
          </Type>
          <Type variant="caption">
            {formatSlotDuration(slot.startUtc, slot.endUtc)} · {formatTzLabel(viewerTimezone)}
          </Type>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Type variant="body">Session price</Type>
            <Type variant="body-strong">{formatCentsAsUsd(grossCents)}</Type>
          </div>
          <div className="flex items-center justify-between">
            <Type variant="body">Platform fee (10%)</Type>
            <Type variant="body">{formatCentsAsUsd(platformFeeCents)}</Type>
          </div>
          <div className="flex items-center justify-between">
            <Type variant="caption">Host receives</Type>
            <Type variant="caption">{formatCentsAsUsd(hostPayoutCents)}</Type>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Type variant="label">Total</Type>
          <Type as="span" variant="h3">
            {formatCentsAsUsd(grossCents)}
          </Type>
        </div>

        <Type variant="caption">
          Payment held until your session is complete.
        </Type>
      </CardContent>
    </Card>
  );
}
