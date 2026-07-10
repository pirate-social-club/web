import { describe, expect, test } from "bun:test";

import type { BookingView } from "@/lib/api/bookings-types";
import {
  BOOKING_JOIN_LEAD_MS,
  groupBookingsForManagement,
  isBookingJoinable,
  nextBookingJoinBoundary,
} from "./booking-management-policy";

const START = Date.parse("2026-07-10T10:00:00.000Z");

function booking(patch: Partial<BookingView> = {}): BookingView {
  return {
    object: "booking",
    booking_id: "bkg_test",
    source_community_id: null,
    host_user_id: "host",
    booker_user_id: "booker",
    counterparty: { user_id: "host", display_name: "Amira", avatar_url: null },
    slot_start_utc: new Date(START).toISOString(),
    slot_end_utc: new Date(START + 30 * 60_000).toISOString(),
    gross_cents: 5000,
    platform_fee_cents: 500,
    host_payout_cents: 4500,
    refund_cents: null,
    status: "confirmed",
    outcome: null,
    settlement_status: "pending",
    funding_tx_ref: null,
    payout_tx_ref: null,
    refund_tx_ref: null,
    live_room_id: null,
    confirmed_at: null,
    completed_at: null,
    settled_at: null,
    cancelled_at: null,
    created_at: new Date(START).toISOString(),
    updated_at: new Date(START).toISOString(),
    viewer_role: "booker",
    ...patch,
  };
}

describe("booking management policy", () => {
  test("keeps confirmed and live bookings joinable through the slot window", () => {
    expect(isBookingJoinable(booking(), START - BOOKING_JOIN_LEAD_MS)).toBe(true);
    expect(isBookingJoinable(booking({ status: "live", settlement_status: "live" }), START)).toBe(true);
    expect(isBookingJoinable(booking({ status: "live", settlement_status: "live" }), START + 30 * 60_000)).toBe(false);
  });

  test("returns the next boundary so a controller can re-render without polling", () => {
    expect(nextBookingJoinBoundary([booking()], START - 10 * 60_000)).toBe(START - BOOKING_JOIN_LEAD_MS);
    expect(nextBookingJoinBoundary([booking()], START)).toBe(START + 30 * 60_000);
  });

  test("keeps disputes, no-shows, and cancellations semantically separate", () => {
    const disputed = booking({ booking_id: "review", status: "disputed", settlement_status: "disputed" });
    const noShow = booking({ booking_id: "no-show", status: "refunded", outcome: "no_show_host", settlement_status: "refunded" });
    const cancelled = booking({ booking_id: "cancelled", status: "refunded", outcome: "cancelled_by_host", settlement_status: "refunded" });
    const grouped = groupBookingsForManagement([disputed, noShow, cancelled]);
    expect(grouped.review.map((item) => item.booking_id)).toEqual(["review"]);
    expect(grouped.past.map((item) => item.booking_id)).toEqual(["no-show"]);
    expect(grouped.cancelled.map((item) => item.booking_id)).toEqual(["cancelled"]);
  });

  test("does not present expired or pre-payment cancellations as upcoming", () => {
    const expired = booking({ booking_id: "expired", status: "expired_hold" });
    const cancelledBeforePayment = booking({ booking_id: "before-payment", status: "cancelled_before_payment" });
    const grouped = groupBookingsForManagement([expired, cancelledBeforePayment]);
    expect(grouped.upcoming).toEqual([]);
    expect(grouped.cancelled.map((item) => item.booking_id)).toEqual(["expired", "before-payment"]);
  });
});
