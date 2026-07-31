"use client";

import * as React from "react";

import { useApi } from "@/lib/api";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";

function viewerTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Loads a host's next-14-days booking availability. Owned by the profile CONTAINER (not the Book-tab
 * content) so a bookable profile warms its slots as soon as the page loads, regardless of the active
 * tab — a direct `#book` deep-link then shows a loader → slots, and a normal visit has the data ready
 * by the time the user opens Book. `enabled` gates the fetch (bookable / owner-configured).
 */
export function useHostAvailability(hostUserId: string | null, enabled: boolean): { slots: ResolvedSlot[]; loading: boolean } {
  const api = useApi();
  const tz = React.useMemo(viewerTimezone, []);
  const [slots, setSlots] = React.useState<ResolvedSlot[]>([]);
  const [loading, setLoading] = React.useState(enabled);

  React.useEffect(() => {
    if (!enabled || !hostUserId) {
      setLoading(false);
      setSlots([]);
      return;
    }
    let active = true;
    setLoading(true);
    setSlots([]);
    void (async () => {
      try {
        const from = new Date().toISOString();
        const to = new Date(Date.now() + 14 * 86_400_000).toISOString();
        const res = await api.bookings.listBookingSlots(hostUserId, { from, to, tz });
        if (active) setSlots(res.slots);
      } catch {
        if (active) setSlots([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, hostUserId, tz, enabled]);

  return { slots, loading };
}
