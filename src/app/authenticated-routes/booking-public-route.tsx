"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { formatCentsAsUsd } from "@/components/compositions/bookings/fixtures/bookings-format";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import { useRequestAuth } from "@/hooks/use-request-auth";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { interpolateMessage } from "@/lib/route-messages";
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

export function BookingPublicPage({ communityId, hostUserId }: { communityId: string | null; hostUserId: string }): React.ReactElement {
  const api = useApi();
  const session = useSession();
  const requestAuth = useRequestAuth();
  const { copy } = useRouteMessages();
  const messages = copy.bookingPublic;
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
      setError(e instanceof ApiError ? e.message : messages.notBookable);
    } finally {
      setLoading(false);
    }
  }, [api, hostUserId, messages.notBookable, tz]);

  React.useEffect(() => { void load(); }, [load]);
  // Slots go stale (other bookers hold/book) — refresh when the tab regains focus.
  React.useEffect(() => {
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Booking creates a hold + quote against authenticated APIs, so a logged-out tap must prompt sign-in
  // (Privy modal) rather than route to a checkout that would 401 into "Authentication failed".
  const onPickSlot = React.useCallback((slot: ResolvedSlot) => {
    if (!session?.accessToken) {
      requestAuth(messages.signInPrompt);
      return;
    }
    // Hand off to checkout, which re-validates availability and creates the hold authoritatively.
    const q = new URLSearchParams({ start: slot.startUtc, end: slot.endUtc });
    const base = communityId
      ? `/c/${encodeURIComponent(communityId)}/book/${encodeURIComponent(hostUserId)}`
      : `/book/${encodeURIComponent(hostUserId)}`;
    navigate(`${base}/checkout?${q.toString()}`);
  }, [communityId, hostUserId, messages.signInPrompt, session?.accessToken, requestAuth]);

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
          <Type as="h1" variant="h2">{messages.title}</Type>
          <Type variant="caption" className="text-muted-foreground">
            {interpolateMessage(messages.timezones, {
              viewerTimezone: tz,
              hostTimezone: data?.host_timezone ?? "—",
            })}
          </Type>
        </div>

        <div className="flex items-center justify-between">
          <Type variant="label">{messages.availableSlots}</Type>
          <Button variant="ghost" size="sm" onClick={() => void load()} loading={loading}>{messages.refresh}</Button>
        </div>

        {loading && !data && <Type variant="body">{messages.loading}</Type>}
        {error && <Type variant="body" className="text-destructive">{error}</Type>}
        {!loading && data && grouped.length === 0 && <Type variant="body" className="text-muted-foreground">{messages.empty}</Type>}

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
                    title={slot.available ? formatCentsAsUsd(slot.priceCents) : messages.unavailable}
                  >
                    {timeLabel(slot.startUtc, tz)} · {formatCentsAsUsd(slot.priceCents)}
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
