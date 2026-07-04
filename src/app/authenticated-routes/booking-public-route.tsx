"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { isCanonicalAuthOrigin, buildCanonicalAuthUrl } from "@/lib/auth-origin";
import type { ResolvedSlot, SlotsResponse } from "@/lib/api/bookings-types";

function viewerTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
}
function timeLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
function priceLabel(cents: number): string { return `${(cents / 100).toFixed(2)} USDC`; }

export function BookingPublicPage({ communityId, hostUserId }: { communityId: string | null; hostUserId: string }): React.ReactElement {
  const api = useApi();
  const session = useSession();
  const authRuntime = usePiratePrivyRuntime();
  const tz = React.useMemo(viewerTimezone, []);
  const [data, setData] = React.useState<SlotsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 14 * 86400_000).toISOString();
      const res = await api.bookings.listBookingSlots(hostUserId, { from, to, tz });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "This host is not currently bookable.");
    } finally {
      setLoading(false);
    }
  }, [api, communityId, hostUserId, tz]);

  React.useEffect(() => { void load(); }, [load]);
  // Slots go stale (other bookers hold/book) — refresh when the tab regains focus.
  React.useEffect(() => {
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Booking creates a hold + quote against authenticated APIs, so a logged-out tap must prompt sign-in
  // (Privy) rather than route to a checkout that would 401 into "Authentication failed". Same auth-prompt
  // pattern the post/live-ticket flows use.
  const requestAuth = React.useCallback((message: string) => {
    if (!isCanonicalAuthOrigin()) {
      const canonicalUrl = buildCanonicalAuthUrl();
      toast.error(message, { action: { label: "Open in Pirate", onClick: () => { window.location.href = canonicalUrl; } } });
      return;
    }
    if (authRuntime.connect) { authRuntime.connect(); return; }
    toast.error(authRuntime.loadError ?? message);
  }, [authRuntime.connect, authRuntime.loadError]);

  const onPickSlot = React.useCallback((slot: ResolvedSlot) => {
    if (!session?.accessToken) {
      requestAuth("Sign in to book a session.");
      return;
    }
    // Hand off to checkout, which re-validates availability and creates the hold authoritatively.
    const q = new URLSearchParams({ start: slot.startUtc, end: slot.endUtc, price: String(slot.priceCents) });
    const base = communityId
      ? `/c/${encodeURIComponent(communityId)}/book/${encodeURIComponent(hostUserId)}`
      : `/book/${encodeURIComponent(hostUserId)}`;
    navigate(`${base}/checkout?${q.toString()}`);
  }, [communityId, hostUserId, session?.accessToken, requestAuth]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, ResolvedSlot[]>();
    for (const slot of data?.slots ?? []) {
      const key = dayKey(slot.startUtc, tz);
      (map.get(key) ?? map.set(key, []).get(key)!).push(slot);
    }
    return [...map.entries()];
  }, [data, tz]);

  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="space-y-1">
          <Type as="h1" variant="h2">Book a session</Type>
          <Type variant="caption" className="text-muted-foreground">
            Times shown in your timezone ({tz}). Host timezone: {data?.host_timezone ?? "—"}.
          </Type>
        </div>

        <div className="flex items-center justify-between">
          <Type variant="label">Available slots (next 14 days)</Type>
          <Button variant="ghost" size="sm" onClick={() => void load()} loading={loading}>Refresh</Button>
        </div>

        {loading && !data && <Type variant="body">Loading availability…</Type>}
        {error && <Type variant="body" className="text-destructive">{error}</Type>}
        {!loading && data && grouped.length === 0 && <Type variant="body" className="text-muted-foreground">No open slots in the next two weeks.</Type>}

        <div className="space-y-5">
          {grouped.map(([day, slots]) => (
            <div key={day} className="space-y-2">
              <Type variant="label">{day}</Type>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <Button
                    key={slot.startUtc}
                    variant={slot.available ? "outline" : "ghost"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => onPickSlot(slot)}
                    title={slot.available ? priceLabel(slot.priceCents) : "Unavailable"}
                  >
                    {timeLabel(slot.startUtc, tz)} · {priceLabel(slot.priceCents)}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StandardRoutePage>
  );
}
