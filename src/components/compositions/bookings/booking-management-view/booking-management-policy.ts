import type { BookingView } from "@/lib/api/bookings-types";

export type BookingManagementSection = "upcoming" | "past" | "cancelled" | "review";

export const BOOKING_JOIN_LEAD_MS = 5 * 60_000;

export function isBookingJoinable(booking: BookingView, nowMs: number): boolean {
  if (booking.status !== "confirmed" && booking.status !== "live") return false;
  const startMs = Date.parse(booking.slot_start_utc);
  const endMs = Date.parse(booking.slot_end_utc);
  return nowMs >= startMs - BOOKING_JOIN_LEAD_MS && nowMs < endMs;
}

export function nextBookingJoinBoundary(bookings: BookingView[], nowMs: number): number | null {
  const boundaries = bookings.flatMap((booking) => {
    if (booking.status !== "confirmed" && booking.status !== "live") return [];
    return [Date.parse(booking.slot_start_utc) - BOOKING_JOIN_LEAD_MS, Date.parse(booking.slot_end_utc)];
  }).filter((boundary) => Number.isFinite(boundary) && boundary > nowMs);
  return boundaries.length > 0 ? Math.min(...boundaries) : null;
}

export function bookingManagementSection(booking: BookingView): BookingManagementSection {
  if (booking.settlement_status === "disputed" || booking.status === "disputed") return "review";
  if (booking.status === "expired_hold" || booking.status === "cancelled_before_payment") return "cancelled";
  if (booking.outcome === "cancelled_by_host" || booking.outcome === "cancelled_by_booker") return "cancelled";
  if (booking.outcome || booking.settlement_status === "settled" || booking.settlement_status === "refunded") return "past";
  return "upcoming";
}

export function groupBookingsForManagement(bookings: BookingView[]): Record<BookingManagementSection, BookingView[]> {
  const grouped: Record<BookingManagementSection, BookingView[]> = {
    upcoming: [],
    review: [],
    past: [],
    cancelled: [],
  };
  for (const booking of bookings) grouped[bookingManagementSection(booking)].push(booking);
  return grouped;
}
