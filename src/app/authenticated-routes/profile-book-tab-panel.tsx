"use client";

import * as React from "react";

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

function checkoutPathForSlot(hostUserId: string, slot: ResolvedSlot): string {
  const q = new URLSearchParams({ start: slot.startUtc, end: slot.endUtc, price: String(slot.priceCents) });
  return `/book/${encodeURIComponent(hostUserId)}/checkout?${q.toString()}`;
}

/**
 * Connected content for the profile Calendar tab. Fetches the host's global availability and
 * renders it. For a **viewer**, a slot tap routes into the canonical global checkout
 * (`/book/:host/checkout`). For the **owner**, the same calendar renders read-only with an
 * "Edit schedule" action. No money moves here — checkout owns pay-in.
 */
export function ProfileBookTabPanel({
  hostUserId,
  owner,
}: {
  hostUserId: string;
  owner?: { configured: boolean; onEdit: () => void };
}): React.ReactElement {
  const api = useApi();
  const tz = React.useMemo(viewerTimezone, []);
  const [slots, setSlots] = React.useState<ResolvedSlot[]>([]);

  const needsSlots = !owner || owner.configured;
  React.useEffect(() => {
    if (!needsSlots) return;
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
  }, [api, hostUserId, tz, needsSlots]);

  const cheapest = slots.reduce(
    (min, s) => (s.available && s.priceCents < min ? s.priceCents : min),
    Number.POSITIVE_INFINITY,
  );
  const basePriceCents = Number.isFinite(cheapest) ? cheapest : 0;

  if (owner) {
    return (
      <ProfileBookPanel
        mode="owner"
        configured={owner.configured}
        basePriceCents={basePriceCents}
        slots={slots}
        viewerTimezone={tz as IanaTz}
        onEdit={owner.onEdit}
      />
    );
  }

  return (
    <ProfileBookPanel
      mode="viewer"
      basePriceCents={basePriceCents}
      slots={slots}
      viewerTimezone={tz as IanaTz}
      getSlotHref={(slot) => checkoutPathForSlot(hostUserId, slot)}
      onSelectSlot={() => undefined}
    />
  );
}
