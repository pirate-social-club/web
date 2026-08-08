"use client";

import * as React from "react";

import { useSession } from "@/lib/api/session-store";
import { useRequestAuth } from "@/hooks/use-request-auth";
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
  const q = new URLSearchParams({ start: slot.startUtc, end: slot.endUtc });
  return `/book/${encodeURIComponent(hostUserId)}/checkout?${q.toString()}`;
}

/**
 * Presentational content for the profile Book tab. Availability is PRELOADED by the profile container
 * (see useHostAvailability) and passed in as slots/loading, so this tab renders immediately without its
 * own fetch. For a **viewer**, a slot tap follows the checkout href when signed in, or is intercepted
 * into the Privy sign-in modal when logged out (never a bare navigation to a would-be 401 checkout).
 * For the **owner**, the same calendar renders read-only with an "Edit schedule" action.
 */
export function ProfileBookTabPanel({
  hostUserId,
  owner,
  slots,
  loading,
}: {
  hostUserId: string;
  owner?: { configured: boolean; onEdit: () => void };
  slots: ResolvedSlot[];
  loading: boolean;
}): React.ReactElement {
  const tz = React.useMemo(viewerTimezone, []);
  const session = useSession();
  const requestAuth = useRequestAuth();

  const cheapest = slots.reduce(
    (min, s) => (s.available && s.priceCents < min ? s.priceCents : min),
    Number.POSITIVE_INFINITY,
  );
  const startingPriceCents = Number.isFinite(cheapest) ? cheapest : 0;

  // Logged-out tap → open the sign-in modal instead of following the anchor to a checkout that would
  // 401. Signed-in taps fall through to the href (checkout).
  const onSelectSlot = React.useCallback((_slot: ResolvedSlot, event?: React.MouseEvent) => {
    if (!session?.accessToken) {
      event?.preventDefault();
      requestAuth("Sign in to book a session.");
    }
  }, [session?.accessToken, requestAuth]);

  if (owner) {
    return (
      <ProfileBookPanel
        mode="owner"
        configured={owner.configured}
        basePriceCents={startingPriceCents}
        slots={slots}
        loading={loading}
        viewerTimezone={tz as IanaTz}
        onEdit={owner.onEdit}
      />
    );
  }

  return (
    <ProfileBookPanel
      mode="viewer"
      startingPriceCents={startingPriceCents}
      slots={slots}
      loading={loading}
      viewerTimezone={tz as IanaTz}
      getSlotHref={(slot) => checkoutPathForSlot(hostUserId, slot)}
      onSelectSlot={onSelectSlot}
    />
  );
}
