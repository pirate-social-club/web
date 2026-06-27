"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { AttachSessionResponse, BookingView } from "@/lib/api/bookings-types";

// Slice D will replace the placeholder surface below with a live Agora RTC component.
// This route is responsible for:
//   1. Fetching the booking to confirm viewer_role and live_room_id.
//   2. Calling startBookingSession (host) or attachBookingSession (booker) to obtain
//      Agora credentials (app_id, channel, uid, token).
//   3. Displaying those credentials for manual join or future Agora widget.

type SessionPhase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "not_available"; message: string }
  | { kind: "ready"; booking: BookingView; session: AttachSessionResponse };

const HEARTBEAT_INTERVAL_MS = 15_000;
const JOIN_LEAD_MS = 5 * 60_000;

// The SAME join window the management page gates "Join session" on. The session route MUST enforce it
// before start/attach: startBookingSession transitions confirmed → live (a payout-relevant lifecycle
// change that then exposes complete/no-show), and the API does not yet enforce schedule bounds — so a
// host hitting the URL directly must not be able to start/settle/no-show outside the scheduled window.
function withinJoinWindow(booking: BookingView): boolean {
  const now = Date.now();
  const start = new Date(booking.slot_start_utc).getTime();
  const end = new Date(booking.slot_end_utc).getTime();
  return now >= start - JOIN_LEAD_MS && now < end;
}
const NO_SHOW_GRACE_MS = 10 * 60_000;
// Mirror the server windows so we never present a control the API would reject:
// complete is valid from the scheduled start; a no-show only after the grace period past it.
function canCompleteNow(booking: BookingView): boolean {
  return Date.now() >= new Date(booking.slot_start_utc).getTime();
}
function canReportNoShowNow(booking: BookingView): boolean {
  return Date.now() >= new Date(booking.slot_start_utc).getTime() + NO_SHOW_GRACE_MS;
}

export function BookingSessionPage({
  communityId,
  bookingId,
}: {
  communityId: string;
  bookingId: string;
}): React.ReactElement {
  const api = useApi();
  const [phase, setPhase] = React.useState<SessionPhase>({ kind: "loading" });
  const [acting, setActing] = React.useState(false);

  const toBookings = React.useCallback(() => navigate(`/c/${encodeURIComponent(communityId)}/bookings`), [communityId]);

  // Settlement actions are idempotent server-side; on success we leave the session and let the bookings
  // list re-fetch authoritative state. Legal-state/role is enforced by the API (errors are surfaced).
  const completeSession = React.useCallback(async () => {
    setActing(true);
    try {
      await api.communities.completeBooking(communityId, bookingId);
      toast.success("Session completed — the host payout will settle.");
      toBookings();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Could not complete the session."); setActing(false); }
  }, [api, communityId, bookingId, toBookings]);
  const reportNoShow = React.useCallback(async () => {
    setActing(true);
    try {
      await api.communities.noShowBooking(communityId, bookingId);
      toast.success("No-show reported.");
      toBookings();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : "Could not report a no-show."); setActing(false); }
  }, [api, communityId, bookingId, toBookings]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { booking } = await api.communities.getBooking(communityId, bookingId);
        if (cancelled) return;

        if (booking.status !== "confirmed" && booking.status !== "live") {
          setPhase({ kind: "error", message: `Session is not active (status: ${booking.status}).` });
          return;
        }

        // GATE: never start/attach (and never expose settlement controls) outside the scheduled join
        // window — this is the only protection around the payout-triggering live transition until the
        // API enforces it. Mirrors the management page's "Join session" visibility rule.
        if (!withinJoinWindow(booking)) {
          const start = new Date(booking.slot_start_utc).getTime();
          setPhase({
            kind: "not_available",
            message: Date.now() < start
              ? "This session isn't available yet. You can join from 5 minutes before the scheduled start time."
              : "This session's scheduled time has passed.",
          });
          return;
        }

        // Host must call startBookingSession to provision the live room before attaching. That
        // transitions confirmed → live, so reflect it locally (gates the end-of-session controls).
        let active = booking;
        if (booking.viewer_role === "host") {
          await api.communities.startBookingSession(communityId, bookingId);
          if (cancelled) return;
          active = { ...booking, status: "live" };
        }

        const session = await api.communities.attachBookingSession(communityId, bookingId);
        if (cancelled) return;
        setPhase({ kind: "ready", booking: active, session });
      } catch (e) {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message: e instanceof ApiError ? e.message : "Could not join session.",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [api, communityId, bookingId]);

  // Presence heartbeat while attached to the live session. It is identity-bound to this session_id and
  // MUST stop the moment the viewer leaves: on visibility loss (tab hidden), on navigation/unmount, and
  // it never fires while hidden — so the server promptly sees an absent participant.
  const readySessionId = phase.kind === "ready" ? phase.session.session_id : null;
  React.useEffect(() => {
    if (!readySessionId) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const beat = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void api.communities
        .heartbeatBookingSession(communityId, bookingId, { session_id: readySessionId })
        .catch(() => { /* transient — the next tick retries; liveness is best-effort */ });
    };
    const start = () => { if (!timer) { beat(); timer = setInterval(beat, HEARTBEAT_INTERVAL_MS); } };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => { if (document.visibilityState === "hidden") stop(); else start(); };
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof document === "undefined" || document.visibilityState !== "hidden") start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [readySessionId, api, communityId, bookingId]);

  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Type as="h1" variant="h2">Session</Type>

        {phase.kind === "loading" && (
          <Type variant="body" className="text-muted-foreground">Connecting…</Type>
        )}

        {phase.kind === "error" && (
          <div className="space-y-4">
            <Type variant="body" className="text-destructive">{phase.message}</Type>
            <Button
              variant="outline"
              onClick={() => navigate(`/c/${encodeURIComponent(communityId)}/bookings`)}
            >
              Back to bookings
            </Button>
          </div>
        )}

        {phase.kind === "not_available" && (
          <div className="space-y-4">
            <Type variant="body" className="text-muted-foreground">{phase.message}</Type>
            <Button variant="outline" onClick={toBookings}>Back to bookings</Button>
          </div>
        )}

        {phase.kind === "ready" && (
          <div className="space-y-4">
            {/* Agora RTC widget renders here in Slice D. */}
            <div className="rounded-lg border border-border p-6 text-center space-y-2">
              <Type variant="label">Session ready</Type>
              <Type variant="caption" className="text-muted-foreground">
                Video session ({phase.session.party}) · channel {phase.session.channel}
              </Type>
              <Type variant="caption" className="text-muted-foreground">
                Live video will be available in an upcoming release.
              </Type>
            </div>

            {/* End-of-session settlement controls — gated by role, live status, AND the same schedule
                timing the server enforces (complete from start; no-show after the grace period). */}
            {phase.booking.status === "live" && (() => {
              const showComplete = phase.booking.viewer_role === "host" && canCompleteNow(phase.booking);
              const showNoShow = canReportNoShowNow(phase.booking);
              if (!showComplete && !showNoShow) {
                return (
                  <Type variant="caption" className="text-muted-foreground">
                    Session controls become available at the scheduled start time.
                  </Type>
                );
              }
              return (
                <div className="flex flex-wrap gap-2">
                  {showComplete && (
                    <Button onClick={() => void completeSession()} loading={acting}>End &amp; complete session</Button>
                  )}
                  {showNoShow && (
                    <Button variant="outline" disabled={acting} onClick={() => void reportNoShow()}>
                      {phase.booking.viewer_role === "host" ? "Report booker no-show" : "Report host no-show"}
                    </Button>
                  )}
                </div>
              );
            })()}

            <Button variant="outline" onClick={toBookings}>Back to bookings</Button>
          </div>
        )}
      </div>
    </StandardRoutePage>
  );
}
