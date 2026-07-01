"use client";

import * as React from "react";

import { useApi } from "@/lib/api";
import type { BookingProfile } from "@/lib/api/bookings-types";

export type OwnBookingCtaState = "setup" | "manage";

function isProfile(p: unknown): p is BookingProfile {
  return Boolean(p) && (p as { exists?: boolean }).exists !== false;
}

/**
 * Self-profile booking CTA state. Reads the viewer's own host-booking profile once:
 * published → "manage", otherwise → "setup". Returns null until known (so the CTA doesn't
 * flicker). Only meaningful on the viewer's own profile — the endpoint is /host-bookings/me/*.
 */
export function useOwnBookingCta(enabled = true): OwnBookingCtaState | null {
  const api = useApi();
  const [state, setState] = React.useState<OwnBookingCtaState | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    void (async () => {
      try {
        const profile = await api.hostBookings.getBookingProfile();
        if (!active) return;
        setState(isProfile(profile) && profile.is_published ? "manage" : "setup");
      } catch {
        // Fail open to the setup affordance; the settings page surfaces any real errors.
        if (active) setState("setup");
      }
    })();
    return () => {
      active = false;
    };
  }, [api, enabled]);

  return state;
}
