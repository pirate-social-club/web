import * as React from "react";

import type { BookingView } from "@/lib/api/bookings-types";

export interface SessionControlAvailability {
  canComplete: boolean;
  canReportNoShow: boolean;
}

// Party-triggered settlement is attendance-derived and the server accepts it only after the entire
// scheduled window closes. Both legacy controls therefore share the slot-end boundary.
export function sessionControlAvailability(booking: BookingView | null, nowMs: number): SessionControlAvailability {
  if (!booking) return { canComplete: false, canReportNoShow: false };
  const end = new Date(booking.slot_end_utc).getTime();
  const available = nowMs >= end;
  return { canComplete: available, canReportNoShow: available };
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
    const next = new Date(booking.slot_end_utc).getTime();
    if (next <= nowMs) return;
    const id = setTimeout(() => setNowMs(Date.now()), Math.max(0, next - Date.now()) + 200);
    return () => clearTimeout(id);
  }, [booking, nowMs]);
  return sessionControlAvailability(booking, nowMs);
}
