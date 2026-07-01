"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { ProfileBookPanel } from "@/components/compositions/bookings/profile-book-panel/profile-book-panel";
import type { IanaTz, ResolvedSlot } from "@/components/compositions/bookings/view-models";

function viewerTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Connected viewer content for the profile Book tab: fetches the host's global availability and
 * routes a slot tap into the canonical global checkout (`/book/:host/checkout`). Rendered only when
 * profile.is_bookable (gated by the container). No money moves here — checkout owns pay-in.
 */
export function ProfileViewerBookPanel({ hostUserId }: { hostUserId: string }): React.ReactElement {
  const api = useApi();
  const tz = React.useMemo(viewerTimezone, []);
  const [slots, setSlots] = React.useState<ResolvedSlot[]>([]);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const from = new Date().toISOString();
        const to = new Date(Date.now() + 14 * 86_400_000).toISOString();
        const res = await api.bookings.listBookingSlots(hostUserId, { from, to, tz });
        if (active) setSlots(res.slots as ResolvedSlot[]);
      } catch {
        if (active) setSlots([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, hostUserId, tz]);

  const cheapest = slots.reduce(
    (min, s) => (s.available && s.priceCents < min ? s.priceCents : min),
    Number.POSITIVE_INFINITY,
  );

  const onSelectSlot = React.useCallback(
    (slot: ResolvedSlot) => {
      const q = new URLSearchParams({ start: slot.startUtc, end: slot.endUtc, price: String(slot.priceCents) });
      navigate(`/book/${encodeURIComponent(hostUserId)}/checkout?${q.toString()}`);
    },
    [hostUserId],
  );

  return (
    <ProfileBookPanel
      mode="viewer"
      basePriceCents={Number.isFinite(cheapest) ? cheapest : 0}
      slots={slots}
      viewerTimezone={tz as IanaTz}
      onSelectSlot={onSelectSlot}
    />
  );
}
