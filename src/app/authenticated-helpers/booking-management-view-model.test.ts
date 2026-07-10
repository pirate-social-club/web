import { describe, expect, test } from "bun:test";

import type { BookingView } from "@/lib/api/bookings-types";
import { bookingCounterpartyLabel, formatBookingTimeRange, toBookingManagementItem, type BookingManagementMessages } from "./booking-management-view-model";

const messages: BookingManagementMessages = new Proxy({}, { get: (_target, key) => String(key) }) as BookingManagementMessages;
const booking: BookingView = {
  object: "booking", booking_id: "booking_1", source_community_id: null, host_user_id: "host", booker_user_id: "booker",
  slot_start_utc: "2026-07-05T12:00:00.000Z", slot_end_utc: "2026-07-05T12:30:00.000Z", gross_cents: 4500,
  platform_fee_cents: 450, host_payout_cents: 4050, refund_cents: null, status: "confirmed", outcome: null,
  settlement_status: "pending", counterparty: { user_id: "usr_counterparty_123456", public_handle: "name.pirate", display_name: "Name", avatar_ref: null },
  funding_tx_ref: null, payout_tx_ref: null, refund_tx_ref: null, live_room_id: null, confirmed_at: null, completed_at: null,
  settled_at: null, cancelled_at: null, created_at: "2026-07-01T00:00:00.000Z", updated_at: "2026-07-01T00:00:00.000Z", viewer_role: "booker",
};

describe("booking management view model", () => {
  test("uses handle, then display name, then a shortened id", () => {
    expect(bookingCounterpartyLabel(booking)).toBe("name.pirate");
    expect(bookingCounterpartyLabel({ ...booking, counterparty: { ...booking.counterparty, public_handle: null } })).toBe("Name");
    expect(bookingCounterpartyLabel({ ...booking, counterparty: { ...booking.counterparty, public_handle: null, display_name: null } })).toBe("usr_coun…3456");
  });

  test("formats the approved compact range in the viewer timezone", () => {
    expect(formatBookingTimeRange(booking.slot_start_utc, booking.slot_end_utc, "en-US", "Asia/Tbilisi"))
      .toBe("4:00 PM–4:30 PM, July 5");
  });

  test("does not collapse a range crossing the viewer-local date boundary", () => {
    expect(formatBookingTimeRange("2026-07-05T03:30:00.000Z", "2026-07-05T04:30:00.000Z", "en-US", "America/New_York"))
      .toBe("11:30 PM, July 4–12:30 AM, July 5");
  });

  test("uses Intl timezone rules through a DST transition", () => {
    expect(formatBookingTimeRange("2026-11-01T05:30:00.000Z", "2026-11-01T07:30:00.000Z", "en-US", "America/New_York"))
      .toBe("1:30 AM–2:30 AM, November 1");
  });

  test("maps live bookings to a rejoinable approved card", () => {
    const item = toBookingManagementItem({ ...booking, status: "live" }, {
      locale: "en-US", timeZone: "Asia/Tbilisi", nowMs: Date.parse("2026-07-05T12:10:00Z"), messages,
    });
    expect(item).toMatchObject({ counterpartyHandle: "name.pirate", joinState: "live", section: "upcoming", amountLabel: "45.00 USDC" });
  });
});
