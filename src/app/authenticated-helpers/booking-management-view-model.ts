import type { BookingManagementItem, BookingManagementTone } from "@/components/compositions/bookings/booking-management-view/booking-management-view";
import { bookingManagementSection, isBookingJoinable } from "@/components/compositions/bookings/booking-management-view/booking-management-policy";
import type { BookingView } from "@/lib/api/bookings-types";

export interface BookingManagementMessages {
  confirmed: string;
  confirmedDetail: string;
  live: string;
  liveDetail: string;
  joinOpens: string;
  review: string;
  reviewDetail: string;
  completed: string;
  completedHostDetail: string;
  completedBookerDetail: string;
  hostMissed: string;
  hostMissedDetail: string;
  bookerMissed: string;
  bookerMissedDetail: string;
  cancelledByHost: string;
  cancelledByHostDetail: string;
  cancelledRefunded: string;
  cancelledNoRefund: string;
  cancelledRefundedDetail: string;
  cancelledNoRefundDetail: string;
  cancelledBeforePayment: string;
  cancelledBeforePaymentDetail: string;
  paymentComplete: string;
  legacyOutcomeUnknown: string;
}

function shortUserId(userId: string): string {
  return userId.length <= 14 ? userId : `${userId.slice(0, 8)}…${userId.slice(-4)}`;
}

export function bookingCounterpartyLabel(booking: BookingView): string {
  return booking.counterparty.public_handle?.trim()
    || booking.counterparty.display_name?.trim()
    || shortUserId(booking.counterparty.user_id);
}

export function formatBookingTimeRange(startIso: string, endIso: string, locale: string, timeZone: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = new Intl.DateTimeFormat(locale, {
    timeZone, year: "numeric", month: "numeric", day: "numeric",
  }).format(start) === new Intl.DateTimeFormat(locale, {
    timeZone, year: "numeric", month: "numeric", day: "numeric",
  }).format(end);
  const time = (value: Date) => new Intl.DateTimeFormat(locale, {
    timeZone, hour: "numeric", minute: "2-digit",
  }).format(value);
  const date = (value: Date) => new Intl.DateTimeFormat(locale, {
    timeZone, month: "long", day: "numeric",
  }).format(value);
  return sameDay
    ? `${time(start)}–${time(end)}, ${date(start)}`
    : `${time(start)}, ${date(start)}–${time(end)}, ${date(end)}`;
}

function presentation(booking: BookingView, messages: BookingManagementMessages): {
  label: string; detail: string; tone: BookingManagementTone;
} {
  if (booking.settlement_status === "disputed" || booking.status === "disputed") {
    return { label: messages.review, detail: messages.reviewDetail, tone: "warning" };
  }
  switch (booking.outcome) {
    case "completed":
      return {
        label: messages.completed,
        detail: booking.viewer_role === "host" ? messages.completedHostDetail : messages.completedBookerDetail,
        tone: "muted",
      };
    case "no_show_host":
      return { label: messages.hostMissed, detail: messages.hostMissedDetail, tone: "warning" };
    case "no_show_booker":
      return { label: messages.bookerMissed, detail: messages.bookerMissedDetail, tone: "warning" };
    case "cancelled_by_host":
      return { label: messages.cancelledByHost, detail: messages.cancelledByHostDetail, tone: "muted" };
    case "cancelled_by_booker":
      return booking.refund_cents && booking.refund_cents > 0
        ? { label: messages.cancelledRefunded, detail: messages.cancelledRefundedDetail, tone: "muted" }
        : { label: messages.cancelledNoRefund, detail: messages.cancelledNoRefundDetail, tone: "muted" };
    default:
      break;
  }
  if (booking.status === "cancelled_before_payment" || booking.status === "expired_hold") {
    return { label: messages.cancelledBeforePayment, detail: messages.cancelledBeforePaymentDetail, tone: "muted" };
  }
  if (booking.status === "live") {
    return { label: messages.live, detail: messages.liveDetail, tone: "success" };
  }
  if (booking.status === "confirmed") {
    return { label: messages.confirmed, detail: messages.confirmedDetail, tone: "success" };
  }
  return { label: messages.paymentComplete, detail: messages.legacyOutcomeUnknown, tone: "muted" };
}

export function toBookingManagementItem(
  booking: BookingView,
  options: { locale: string; timeZone: string; nowMs: number; messages: BookingManagementMessages },
): BookingManagementItem {
  const status = presentation(booking, options.messages);
  const joinable = isBookingJoinable(booking, options.nowMs);
  return {
    id: booking.booking_id,
    counterpartyName: booking.counterparty.display_name?.trim() || bookingCounterpartyLabel(booking),
    counterpartyHandle: bookingCounterpartyLabel(booking),
    counterpartyAvatarUrl: booking.counterparty.avatar_ref,
    sessionTimeLabel: formatBookingTimeRange(booking.slot_start_utc, booking.slot_end_utc, options.locale, options.timeZone),
    amountLabel: `${(booking.gross_cents / 100).toFixed(2)} USDC`,
    statusLabel: status.label,
    statusDetail: status.detail,
    statusTone: status.tone,
    section: bookingManagementSection(booking),
    joinState: joinable ? (booking.status === "live" ? "live" : "available") : "unavailable",
    joinAvailabilityLabel: booking.status === "confirmed" ? options.messages.joinOpens : undefined,
    canCancel: booking.status === "confirmed",
    canAddToCalendar: booking.status === "confirmed" || booking.status === "live",
  };
}
