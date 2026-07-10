import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";

import type { BookingView } from "@/lib/api/bookings-types";
import {
  sessionControlAvailability,
  useSessionControlAvailability,
} from "./booking-session-availability";

const bookingEndingAt = (endMs: number): BookingView =>
  ({ slot_end_utc: new Date(endMs).toISOString() } as BookingView);

describe("sessionControlAvailability (pure boundaries)", () => {
  const end = 1_700_000_000_000;
  test("complete is unavailable before slot_end and available exactly at slot_end", () => {
    expect(sessionControlAvailability(bookingEndingAt(end), end - 1).canComplete).toBe(false);
    expect(sessionControlAvailability(bookingEndingAt(end), end).canComplete).toBe(true);
  });
  test("attendance review shares the slot_end boundary", () => {
    expect(sessionControlAvailability(bookingEndingAt(end), end - 1).canReportNoShow).toBe(false);
    expect(sessionControlAvailability(bookingEndingAt(end), end).canReportNoShow).toBe(true);
  });
  test("null booking → nothing available", () => {
    expect(sessionControlAvailability(null, end)).toEqual({ canComplete: false, canReportNoShow: false });
  });
});

describe("useSessionControlAvailability (re-renders at the boundary)", () => {
  test("complete appears when slot_end passes (no unrelated render needed)", async () => {
    const booking = bookingEndingAt(Date.now() + 300);
    const { result } = renderHook(() => useSessionControlAvailability(booking));
    expect(result.current.canComplete).toBe(false);
    await waitFor(() => expect(result.current.canComplete).toBe(true), { timeout: 3000 });
  });

  test("attendance review appears when slot_end passes", async () => {
    const booking = bookingEndingAt(Date.now() + 300);
    const { result } = renderHook(() => useSessionControlAvailability(booking));
    expect(result.current.canReportNoShow).toBe(false);
    await waitFor(() => expect(result.current.canReportNoShow).toBe(true), { timeout: 3000 });
  });
});
