import type { AttendanceReportingHealth } from "@/components/compositions/bookings/booking-session-controls/booking-session-controls";

export const BOOKING_HEARTBEAT_INTERVAL_MS = 15_000;
export const BOOKING_HEARTBEAT_DEGRADED_FAILURES = 3;
export const BOOKING_HEARTBEAT_DEGRADED_AFTER_MS = 45_000;

export interface BookingHeartbeatState {
  consecutiveFailures: number;
  lastSuccessAt: number | null;
  startedAt: number;
}

export function initialBookingHeartbeatState(nowMs: number): BookingHeartbeatState {
  return { consecutiveFailures: 0, lastSuccessAt: null, startedAt: nowMs };
}

export function bookingHeartbeatSucceeded(state: BookingHeartbeatState, nowMs: number): BookingHeartbeatState {
  return { ...state, consecutiveFailures: 0, lastSuccessAt: nowMs };
}

export function bookingHeartbeatFailed(state: BookingHeartbeatState): BookingHeartbeatState {
  return { ...state, consecutiveFailures: state.consecutiveFailures + 1 };
}

export function bookingHeartbeatHealth(state: BookingHeartbeatState, nowMs: number): AttendanceReportingHealth {
  if (state.consecutiveFailures === 0) return "healthy";
  const reference = state.lastSuccessAt ?? state.startedAt;
  return state.consecutiveFailures >= BOOKING_HEARTBEAT_DEGRADED_FAILURES
    || nowMs - reference >= BOOKING_HEARTBEAT_DEGRADED_AFTER_MS
    ? "degraded"
    : "retrying";
}
