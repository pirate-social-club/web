import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

let listBookingSlots: ReturnType<typeof mock>;
// Stable api object across renders (the real useApi is memoized); a fresh object each render would make
// the effect's [api] dep change forever.
let fakeApi: { bookings: { listBookingSlots: ReturnType<typeof mock> } };
mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));

const { useHostAvailability } = await import("./use-host-availability");

beforeEach(() => {
  listBookingSlots = mock(async () => ({
    host_timezone: "UTC",
    viewer_timezone: "UTC",
    slots: [{ startUtc: "2099-01-05T10:00:00.000Z", endUtc: "2099-01-05T10:30:00.000Z", priceCents: 5000, available: true }],
  }));
  fakeApi = { bookings: { listBookingSlots } };
});

afterEach(() => {
  cleanup();
});

describe("useHostAvailability", () => {
  // Preload: when enabled, fetch immediately (loading→slots) so the profile container warms availability.
  test("fetches slots when enabled", async () => {
    const { result } = renderHook(() => useHostAvailability("usr_host", true));
    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(listBookingSlots).toHaveBeenCalledTimes(1);
    expect(result.current.slots).toHaveLength(1);
  });

  test("does not fetch when disabled or host is null", () => {
    const { result: disabled } = renderHook(() => useHostAvailability("usr_host", false));
    const { result: noHost } = renderHook(() => useHostAvailability(null, true));
    expect(listBookingSlots).not.toHaveBeenCalled();
    expect(disabled.current.loading).toBe(false);
    expect(noHost.current.loading).toBe(false);
  });
});
