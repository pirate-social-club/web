import { Show } from "solid-js";

import { Button, Card, CardContent, Type, cn } from "../../../design-system";
import {
  formatBookingDate,
  formatCentsAsUsdc,
  formatSlotDuration,
  formatSlotTime,
  formatTzLabel,
} from "../booking-format";
import type { BookingState, IanaTz, IsoInstant } from "../view-models";

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
  class?: string;
}

interface StateDisplay {
  label: string;
  description: string;
  tone: "default" | "warning" | "success" | "muted";
}

function stateDisplay(state: BookingState): StateDisplay {
  switch (state) {
    case "hold": return { description: "Complete your payment to confirm.", label: "Slot held", tone: "warning" };
    case "quoted": return { description: "Review and pay to reserve your slot.", label: "Quote ready", tone: "default" };
    case "pending_payment": return { description: "Waiting for on-chain confirmation.", label: "Payment verifying", tone: "warning" };
    case "confirmed": return { description: "Your session is booked.", label: "Confirmed", tone: "success" };
    case "live": return { description: "Session is live.", label: "In progress", tone: "success" };
    case "completed": return { description: "Session finished.", label: "Completed", tone: "muted" };
    case "settled": return { description: "Host payout complete.", label: "Settled", tone: "muted" };
    case "expired_hold": return { description: "The slot was released.", label: "Hold expired", tone: "muted" };
    case "cancelled_before_payment": return { description: "Cancelled before payment — no charge.", label: "Cancelled", tone: "muted" };
    case "cancelled_by_host": return { description: "Full refund issued.", label: "Cancelled by host", tone: "muted" };
    case "cancelled_by_booker": return { description: "Refund per cancellation policy.", label: "Cancelled", tone: "muted" };
    case "no_show_host": return { description: "Full refund issued.", label: "Host no-show", tone: "warning" };
    case "no_show_booker": return { description: "No refund per policy.", label: "No-show", tone: "warning" };
    case "refunded": return { description: "Refund complete.", label: "Refunded", tone: "muted" };
    case "disputed": return { description: "Dispute open — awaiting resolution.", label: "Under review", tone: "warning" };
  }
}

const toneClass: Record<StateDisplay["tone"], string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
};

export function BookingStatusCard(props: BookingStatusCardProps) {
  const display = () => stateDisplay(props.state);
  const showJoin = () => props.state === "confirmed" || props.state === "live";
  const showAddToCalendar = () => props.state === "confirmed" || props.state === "live" || props.state === "completed";
  const showCancel = () => props.state === "confirmed" || props.state === "pending_payment" || props.state === "quoted";

  return (
    <Card class={props.class}>
      <CardContent class="flex flex-col gap-4 p-6">
        <div class="flex flex-col gap-1">
          <Type variant="label" class={cn(toneClass[display().tone])}>{display().label}</Type>
          <Type variant="caption">{display().description}</Type>
        </div>

        <div class="flex flex-col gap-1">
          <Type variant="body-strong">{props.hostName}</Type>
          <Type variant="body">
            {formatBookingDate(props.startUtc, props.viewerTimezone)}{" at "}{formatSlotTime(props.startUtc, props.viewerTimezone)}
          </Type>
          <Type variant="caption">
            {formatSlotDuration(props.startUtc, props.endUtc)}{" · "}{formatTzLabel(props.viewerTimezone)}
          </Type>
        </div>

        <div class="flex items-center justify-between">
          <Type variant="caption">Total paid</Type>
          <Type variant="body-strong">{formatCentsAsUsdc(props.priceCents)}</Type>
        </div>

        <Show when={showJoin()}>
          <div class="flex flex-col gap-2">
            <Button
              class="w-full"
              disabled={!props.canJoinSession}
              onClick={props.onJoin}
              size="lg"
            >
              {props.state === "live" ? "Rejoin session" : "Join session"}
            </Button>
            <Show when={!props.canJoinSession && props.joinDisabledReason}>
              <Type variant="caption">{props.joinDisabledReason}</Type>
            </Show>
          </div>
        </Show>

        <Show when={showAddToCalendar()}>
          <Button class="w-full" onClick={props.onAddToCalendar} variant="secondary">
            Add to calendar
          </Button>
        </Show>

        <Show when={showCancel()}>
          <Button class="w-full" onClick={props.onCancel} variant="ghost">
            Cancel booking
          </Button>
        </Show>
      </CardContent>
    </Card>
  );
}
