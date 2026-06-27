import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";

import type { BookingView } from "@/lib/api/bookings-types";
import {
  NO_SHOW_GRACE_MS,
  sessionControlAvailability,
  useSessionControlAvailability,
} from "./booking-session-availability";

const bookingStartingAt = (startMs: number): BookingView =>
  ({ slot_start_utc: new Date(startMs).toISOString() } as BookingView);

describe("sessionControlAvailability (pure boundaries)", () => {
  const start = 1_700_000_000_000;
  test("complete is unavailable before slot_start and available exactly at slot_start", () => {
    expect(sessionControlAvailability(bookingStartingAt(start), start - 1).canComplete).toBe(false);
    expect(sessionControlAvailability(bookingStartingAt(start), start).canComplete).toBe(true);
  });
  test("no-show is unavailable until slot_start + 10min grace, then available", () => {
    expect(sessionControlAvailability(bookingStartingAt(start), start + NO_SHOW_GRACE_MS - 1).canReportNoShow).toBe(false);
    expect(sessionControlAvailability(bookingStartingAt(start), start + NO_SHOW_GRACE_MS).canReportNoShow).toBe(true);
    expect(NO_SHOW_GRACE_MS).toBe(10 * 60_000);
  });
  test("null booking → nothing available", () => {
    expect(sessionControlAvailability(null, start)).toEqual({ canComplete: false, canReportNoShow: false });
  });
});

describe("useSessionControlAvailability (re-renders at the boundary)", () => {
  test("complete appears when slot_start passes (no unrelated render needed)", async () => {
    const booking = bookingStartingAt(Date.now() + 300);
    const { result } = renderHook(() => useSessionControlAvailability(booking));
    expect(result.current.canComplete).toBe(false);
    await waitFor(() => expect(result.current.canComplete).toBe(true), { timeout: 3000 });
  });

  test("no-show appears when slot_start + 10min grace passes", async () => {
    // Place the grace boundary ~300ms out (slot_start ~10min in the past) so a short real timer fires it.
    const booking = bookingStartingAt(Date.now() - NO_SHOW_GRACE_MS + 300);
    const { result } = renderHook(() => useSessionControlAvailability(booking));
    expect(result.current.canReportNoShow).toBe(false);
    await waitFor(() => expect(result.current.canReportNoShow).toBe(true), { timeout: 3000 });
  });
});
