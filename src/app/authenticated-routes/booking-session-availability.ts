import * as React from "react";

import type { BookingView } from "@/lib/api/bookings-types";

export const NO_SHOW_GRACE_MS = 10 * 60_000;

export interface SessionControlAvailability {
  canComplete: boolean;
  canReportNoShow: boolean;
}

// Pure boundary logic mirroring the server windows: complete is valid from the scheduled start; a
// no-show only after the grace period past it.
export function sessionControlAvailability(booking: BookingView | null, nowMs: number): SessionControlAvailability {
  if (!booking) return { canComplete: false, canReportNoShow: false };
  const start = new Date(booking.slot_start_utc).getTime();
  return { canComplete: nowMs >= start, canReportNoShow: nowMs >= start + NO_SHOW_GRACE_MS };
}

/**
 * Reactive availability of the settlement controls. A render-time Date.now() check never re-renders
 * when a boundary passes, so a host who joins early would be stuck on the "not available yet" hint.
 * This schedules a one-shot timer to the NEXT unpassed boundary (slot_start, then slot_start+grace),
 * re-rendering exactly when it elapses, and tears the timer down on unmount / booking change.
 */
export function useSessionControlAvailability(booking: BookingView | null): SessionControlAvailability {
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!booking) return;
    const start = new Date(booking.slot_start_utc).getTime();
    const next = [start, start + NO_SHOW_GRACE_MS].filter((b) => b > nowMs).sort((a, b) => a - b)[0];
    if (next === undefined) return; // both boundaries already passed — no further re-render needed
    const id = setTimeout(() => setNowMs(Date.now()), Math.max(0, next - Date.now()) + 200);
    return () => clearTimeout(id);
  }, [booking, nowMs]);
  return sessionControlAvailability(booking, nowMs);
}
