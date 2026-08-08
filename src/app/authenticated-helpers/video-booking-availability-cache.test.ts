import { describe, expect, mock, test } from "bun:test";

import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { VideoBookingAvailabilityCache } from "./video-booking-availability-cache";

const slot: ResolvedSlot = {
  available: true,
  endUtc: "2026-07-24T10:30:00.000Z",
  priceCents: 3500,
  startUtc: "2026-07-24T10:00:00.000Z",
};

describe("VideoBookingAvailabilityCache", () => {
  test("deduplicates concurrent loads and caches a positive result", async () => {
    let resolve!: (slots: ResolvedSlot[]) => void;
    const load = mock(() => new Promise<ResolvedSlot[]>((next) => { resolve = next; }));
    const cache = new VideoBookingAvailabilityCache(load);

    const first = cache.ensure("usr_host");
    const second = cache.ensure("usr_host");
    resolve([slot]);

    expect(await first).toEqual([slot]);
    expect(await second).toEqual([slot]);
    expect(await cache.ensure("usr_host")).toEqual([slot]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("does not negative-cache empty availability or failures", async () => {
    const load = mock()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce([slot]);
    const cache = new VideoBookingAvailabilityCache(load);

    expect(await cache.ensure("usr_host")).toEqual([]);
    await expect(cache.ensure("usr_host")).rejects.toThrow("unavailable");
    expect(await cache.ensure("usr_host")).toEqual([slot]);
    expect(load).toHaveBeenCalledTimes(3);
  });

  test("expires and invalidates positive entries", async () => {
    let now = 100;
    const load = mock(async () => [slot]);
    const cache = new VideoBookingAvailabilityCache(load, 50, () => now);

    await cache.ensure("usr_host");
    now = 151;
    await cache.ensure("usr_host");
    cache.invalidate("usr_host");
    await cache.ensure("usr_host");

    expect(load).toHaveBeenCalledTimes(3);
  });
});
