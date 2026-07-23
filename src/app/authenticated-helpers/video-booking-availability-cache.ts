import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";

export type VideoBookingAvailabilityLoader = (
  hostUserId: string,
) => Promise<ResolvedSlot[]>;

interface CacheEntry {
  expiresAt: number;
  slots: ResolvedSlot[];
}

/** Short-lived, positive-only availability cache for booking sheets opened from the video feed. */
export class VideoBookingAvailabilityCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<ResolvedSlot[]>>();

  constructor(
    private readonly load: VideoBookingAvailabilityLoader,
    private readonly ttlMs = 60_000,
    private readonly now = Date.now,
  ) {}

  get(hostUserId: string): ResolvedSlot[] | undefined {
    const entry = this.entries.get(hostUserId);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(hostUserId);
      return undefined;
    }
    return entry.slots;
  }

  async ensure(hostUserId: string): Promise<ResolvedSlot[]> {
    const cached = this.get(hostUserId);
    if (cached) return cached;
    const pending = this.inFlight.get(hostUserId);
    if (pending) return await pending;

    const request = this.load(hostUserId)
      .then((slots) => {
        if (slots.length > 0) {
          this.entries.set(hostUserId, {
            expiresAt: this.now() + this.ttlMs,
            slots,
          });
        }
        return slots;
      })
      .finally(() => {
        this.inFlight.delete(hostUserId);
      });
    this.inFlight.set(hostUserId, request);
    return await request;
  }

  invalidate(hostUserId: string): void {
    this.entries.delete(hostUserId);
  }
}
