import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";

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

  test("drops the previous host result while switching hosts mid-request", async () => {
    let resolveFirst: ((value: { slots: ResolvedSlot[] }) => void) | undefined;
    let resolveSecond: ((value: { slots: ResolvedSlot[] }) => void) | undefined;
    listBookingSlots = mock((hostUserId: string) => new Promise<{ slots: ResolvedSlot[] }>((resolve) => {
      if (hostUserId === "usr_first") {
        resolveFirst = resolve;
      } else {
        resolveSecond = resolve;
      }
    }));
    fakeApi = { bookings: { listBookingSlots } };

    const view = renderHook(({ hostUserId }: { hostUserId: string }) => useHostAvailability(hostUserId, true), {
      initialProps: { hostUserId: "usr_first" },
    });
    await waitFor(() => expect(listBookingSlots).toHaveBeenCalledWith("usr_first", expect.any(Object)));

    await act(async () => {
      view.rerender({ hostUserId: "usr_second" });
    });
    expect(view.result.current.loading).toBe(true);
    expect(view.result.current.slots).toEqual([]);

    await act(async () => {
      resolveFirst?.({
        slots: [{ startUtc: "2099-01-05T10:00:00.000Z", endUtc: "2099-01-05T10:30:00.000Z", priceCents: 5000, available: true }],
      });
    });
    expect(view.result.current.slots).toEqual([]);

    await act(async () => {
      resolveSecond?.({
        slots: [{ startUtc: "2099-01-06T10:00:00.000Z", endUtc: "2099-01-06T10:30:00.000Z", priceCents: 7000, available: true }],
      });
    });
    await waitFor(() => expect(view.result.current.slots[0]?.startUtc).toBe("2099-01-06T10:00:00.000Z"));
  });
});
