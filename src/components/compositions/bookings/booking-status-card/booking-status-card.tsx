
import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { BookingState, IanaTz, IsoInstant } from "../view-models";

import {
  formatBookingDate,
  formatCentsAsUsdc,
  formatSlotDuration,
  formatSlotTime,
  formatTzLabel,
} from "../fixtures/bookings-format";

export interface BookingStatusCardProps {
  state: BookingState;
  hostName: string;
  startUtc: IsoInstant;
  endUtc: IsoInstant;
  priceCents: number;
  viewerTimezone: IanaTz;
  canJoinSession: boolean;
  joinDisabledReason?: string;
  onJoin?: () => void;
  onAddToCalendar?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface StateDisplay {
  label: string;
  description: string;
  tone: "default" | "warning" | "success" | "muted";
}

function stateDisplay(state: BookingState): StateDisplay {
  switch (state) {
    case "hold":
      return { label: "Slot held", description: "Complete your payment to confirm.", tone: "warning" };
    case "quoted":
      return { label: "Quote ready", description: "Review and pay to reserve your slot.", tone: "default" };
    case "pending_payment":
      return { label: "Payment verifying", description: "Waiting for on-chain confirmation.", tone: "warning" };
    case "confirmed":
      return { label: "Confirmed", description: "Your session is booked.", tone: "success" };
    case "live":
      return { label: "In progress", description: "Session is live.", tone: "success" };
    case "completed":
      return { label: "Completed", description: "Session finished.", tone: "muted" };
    case "settled":
      return { label: "Settled", description: "Host payout complete.", tone: "muted" };
    case "expired_hold":
      return { label: "Hold expired", description: "The slot was released.", tone: "muted" };
    case "cancelled_before_payment":
      return { label: "Cancelled", description: "Cancelled before payment — no charge.", tone: "muted" };
    case "cancelled_by_host":
      return { label: "Cancelled by host", description: "Full refund issued.", tone: "muted" };
    case "cancelled_by_booker":
      return { label: "Cancelled", description: "Refund per cancellation policy.", tone: "muted" };
    case "no_show_host":
      return { label: "Host no-show", description: "Full refund issued.", tone: "warning" };
    case "no_show_booker":
      return { label: "No-show", description: "No refund per policy.", tone: "warning" };
    case "refunded":
      return { label: "Refunded", description: "Refund complete.", tone: "muted" };
    case "disputed":
      return { label: "Under review", description: "Dispute open — awaiting resolution.", tone: "warning" };
  }
}

const toneClass: Record<StateDisplay["tone"], string> = {
  default: "text-foreground",
  warning: "text-warning",
  success: "text-success",
  muted: "text-muted-foreground",
};

export function BookingStatusCard({
  state,
  hostName,
  startUtc,
  endUtc,
  priceCents,
  viewerTimezone,
  canJoinSession,
  joinDisabledReason,
  onJoin,
  onAddToCalendar,
  onCancel,
  className,
}: BookingStatusCardProps) {
  const display = stateDisplay(state);
  const showJoin = state === "confirmed" || state === "live";
  const showAddToCalendar = state === "confirmed" || state === "live" || state === "completed";
  const showCancel = state === "confirmed" || state === "pending_payment" || state === "quoted";

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <Type variant="label" className={cn(toneClass[display.tone])}>
            {display.label}
          </Type>
          <Type variant="caption">{display.description}</Type>
        </div>

        <div className="flex flex-col gap-1">
          <Type variant="body-strong">{hostName}</Type>
          <Type variant="body">
            {formatBookingDate(startUtc, viewerTimezone)} at{" "}
            {formatSlotTime(startUtc, viewerTimezone)}
          </Type>
          <Type variant="caption">
            {formatSlotDuration(startUtc, endUtc)} · {formatTzLabel(viewerTimezone)}
          </Type>
        </div>

        <div className="flex items-center justify-between">
          <Type variant="caption">Total paid</Type>
          <Type variant="body-strong">{formatCentsAsUsdc(priceCents)}</Type>
        </div>

        {showJoin ? (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={!canJoinSession}
              onClick={onJoin}
              size="lg"
            >
              {state === "live" ? "Rejoin session" : "Join session"}
            </Button>
            {!canJoinSession && joinDisabledReason ? (
              <Type variant="caption">{joinDisabledReason}</Type>
            ) : null}
          </div>
        ) : null}

        {showAddToCalendar ? (
          <Button
            className="w-full"
            onClick={onAddToCalendar}
            variant="secondary"
          >
            Add to calendar
          </Button>
        ) : null}

        {showCancel ? (
          <Button
            className="w-full"
            onClick={onCancel}
            variant="ghost"
          >
            Cancel booking
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
