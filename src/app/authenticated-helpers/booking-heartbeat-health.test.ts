import { describe, expect, test } from "bun:test";

import {
  bookingHeartbeatFailed,
  bookingHeartbeatHealth,
  bookingHeartbeatSucceeded,
  initialBookingHeartbeatState,
} from "./booking-heartbeat-health";

describe("booking heartbeat health", () => {
  test("warns on a transient failure and degrades after three consecutive failures", () => {
    let state = initialBookingHeartbeatState(1_000);
    state = bookingHeartbeatFailed(state);
    expect(bookingHeartbeatHealth(state, 16_000)).toBe("retrying");
    state = bookingHeartbeatFailed(bookingHeartbeatFailed(state));
    expect(bookingHeartbeatHealth(state, 46_000)).toBe("degraded");
  });

  test("degrades by elapsed time even with fewer failures", () => {
    const state = bookingHeartbeatFailed(initialBookingHeartbeatState(1_000));
    expect(bookingHeartbeatHealth(state, 46_000)).toBe("degraded");
  });

  test("a successful heartbeat restores healthy reporting", () => {
    const failed = bookingHeartbeatFailed(initialBookingHeartbeatState(1_000));
    const recovered = bookingHeartbeatSucceeded(failed, 20_000);
    expect(bookingHeartbeatHealth(recovered, 60_000)).toBe("healthy");
  });
});
