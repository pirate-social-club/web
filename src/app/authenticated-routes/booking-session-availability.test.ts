import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";

import type { BookingView } from "@/lib/api/bookings-types";
import {
  sessionControlAvailability,
  useSessionControlAvailability,
} from "./booking-session-availability";

const bookingStartingAt = (startMs: number): BookingView =>
  ({
    slot_start_utc: new Date(startMs).toISOString(),
    slot_end_utc: new Date(startMs + 60 * 60_000).toISOString(),
  } as BookingView);

describe("sessionControlAvailability (pure boundaries)", () => {
  const start = 1_700_000_000_000;
  test("resolution is unavailable before slot_end and available exactly at slot_end", () => {
    const end = start + 60 * 60_000;
    expect(sessionControlAvailability(bookingStartingAt(start), end - 1).canComplete).toBe(false);
    expect(sessionControlAvailability(bookingStartingAt(start), end)).toEqual({ canComplete: true, canReportNoShow: true });
  });
  test("null booking → nothing available", () => {
    expect(sessionControlAvailability(null, start)).toEqual({ canComplete: false, canReportNoShow: false });
  });
});

describe("useSessionControlAvailability (re-renders at the boundary)", () => {
  test("resolution appears when slot_end passes (no unrelated render needed)", async () => {
    const booking = bookingStartingAt(Date.now() - 60 * 60_000 + 300);
    const { result } = renderHook(() => useSessionControlAvailability(booking));
    expect(result.current.canComplete).toBe(false);
    await waitFor(() => expect(result.current.canComplete).toBe(true), { timeout: 3000 });
  });

});
