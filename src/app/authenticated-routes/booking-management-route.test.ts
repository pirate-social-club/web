import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import type { BookingView } from "@/lib/api/bookings-types";
import { groupBookings, isJoinable } from "./booking-management-route";

const START = Date.parse("2026-07-10T10:00:00.000Z");

function booking(patch: Partial<BookingView> = {}): BookingView {
  return {
    object: "booking",
    booking_id: "bkg_test",
    source_community_id: null,
    host_user_id: "host",
    booker_user_id: "booker",
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

describe("booking management session state", () => {
  test("keeps a live booking joinable for the second participant", () => {
    expect(isJoinable(booking({ status: "live", settlement_status: "live" }), START)).toBe(true);
    expect(isJoinable(booking({ status: "live", settlement_status: "live" }), START + 30 * 60_000)).toBe(false);
  });

  test("separates disputes and no-shows from cancelled bookings", () => {
    const disputed = booking({ booking_id: "review", status: "disputed", settlement_status: "disputed" });
    const noShow = booking({ booking_id: "no-show", status: "refunded", outcome: "no_show_host", settlement_status: "refunded" });
    const cancelled = booking({ booking_id: "cancelled", status: "refunded", outcome: "cancelled_by_host", settlement_status: "refunded" });
    const grouped = groupBookings([disputed, noShow, cancelled]);
    expect(grouped.review.map((item) => item.booking_id)).toEqual(["review"]);
    expect(grouped.past.map((item) => item.booking_id)).toEqual(["no-show"]);
    expect(grouped.cancelled.map((item) => item.booking_id)).toEqual(["cancelled"]);
  });
});
