import { Card, CardContent, Separator, Type } from "../../../design-system";
import { formatCentsAsUsdc, formatBookingDate, formatSlotDuration, formatSlotTime, formatTzLabel } from "../booking-format";
import type { BookingQuotePreview, IanaTz } from "../view-models";

export interface BookingSummaryProps {
  quote: BookingQuotePreview;
  viewerTimezone: IanaTz;
  class?: string;
}

export function BookingSummary(props: BookingSummaryProps) {
  return (
    <Card class={props.class}>
      <CardContent class="flex flex-col gap-4 p-6">
        <div class="flex flex-col gap-1">
          <Type variant="label">Session</Type>
          <Type variant="body-strong">
            {formatBookingDate(props.quote.slot.startUtc, props.viewerTimezone)}{" at "}{formatSlotTime(props.quote.slot.startUtc, props.viewerTimezone)}
          </Type>
          <Type variant="caption">
            {formatSlotDuration(props.quote.slot.startUtc, props.quote.slot.endUtc)}{" · "}{formatTzLabel(props.viewerTimezone)}
          </Type>
        </div>

        <Separator />

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <Type variant="body">Session price</Type>
            <Type variant="body-strong">{formatCentsAsUsdc(props.quote.grossCents)}</Type>
          </div>
          <div class="flex items-center justify-between">
            <Type variant="body">Platform fee (10%)</Type>
            <Type variant="body">{formatCentsAsUsdc(props.quote.platformFeeCents)}</Type>
          </div>
          <div class="flex items-center justify-between">
            <Type variant="caption">Host receives</Type>
            <Type variant="caption">{formatCentsAsUsdc(props.quote.hostPayoutCents)}</Type>
          </div>
        </div>

        <Separator />

        <div class="flex items-center justify-between">
          <Type variant="label">Total</Type>
          <Type as="span" variant="h3">{formatCentsAsUsdc(props.quote.grossCents)}</Type>
        </div>

        <Type variant="caption">Payment held until your session is complete.</Type>
      </CardContent>
    </Card>
  );
}
