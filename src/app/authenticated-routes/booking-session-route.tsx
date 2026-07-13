"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { toast } from "@/components/primitives/sonner";
import { BookingVideoStage } from "@/components/compositions/bookings/booking-video-stage";
import { BookingSessionControls, type AttendanceReportingHealth } from "@/components/compositions/bookings/booking-session-controls/booking-session-controls";
import { useSessionControlAvailability } from "./booking-session-availability";
import {
  BOOKING_HEARTBEAT_INTERVAL_MS,
  bookingHeartbeatFailed,
  bookingHeartbeatHealth,
  bookingHeartbeatSucceeded,
  initialBookingHeartbeatState,
} from "@/app/authenticated-helpers/booking-heartbeat-health";
import { bookingCounterpartyLabel } from "@/app/authenticated-helpers/booking-management-view-model";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { AttachSessionResponse, BookingView } from "@/lib/api/bookings-types";

// This route gates session access to the scheduled join window, attaches the viewer
// to the booking session, renders the Agora RTC stage, and keeps attendance fresh
// with periodic heartbeats while the route is open.

type SessionPhase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "not_available"; message: string }
  | { kind: "ready"; booking: BookingView; session: AttachSessionResponse };

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

export function BookingSessionPage({
  bookingId,
  VideoStage = BookingVideoStage,
}: {
  bookingId: string;
  VideoStage?: typeof BookingVideoStage;
}): React.ReactElement {
  const api = useApi();
  const { copy } = useRouteMessages();
  const messages = copy.bookingManagement;
  const [phase, setPhase] = React.useState<SessionPhase>({ kind: "loading" });
  const [acting, setActing] = React.useState(false);
  const [attendanceHealth, setAttendanceHealth] = React.useState<AttendanceReportingHealth>("healthy");

  const toBookings = React.useCallback(() => navigate("/bookings"), []);

  // Settlement actions are idempotent server-side; on success we leave the session and let the bookings
  // list re-fetch authoritative state. Legal-state/role is enforced by the API (errors are surfaced).
  const completeSession = React.useCallback(async () => {
    setActing(true);
    try {
      await api.bookings.completeBooking(bookingId);
      toast.success(messages.route.completedToast);
      toBookings();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : messages.route.completeError); setActing(false); }
  }, [api, bookingId, messages.route.completeError, messages.route.completedToast, toBookings]);
  const reportNoShow = React.useCallback(async () => {
    setActing(true);
    try {
      await api.bookings.noShowBooking(bookingId);
      toast.success(messages.route.reportedToast);
      toBookings();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : messages.route.reportError); setActing(false); }
  }, [api, bookingId, messages.route.reportError, messages.route.reportedToast, toBookings]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { booking } = await api.bookings.getBooking(bookingId);
        if (cancelled) return;

        if (booking.status !== "confirmed" && booking.status !== "live") {
          setPhase({ kind: "error", message: messages.route.notActive });
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
              ? messages.route.notYet
              : messages.route.passed,
          });
          return;
        }

        // Host must call startBookingSession to provision the live room before attaching. That
        // transitions confirmed → live, so reflect it locally (gates the end-of-session controls).
        let active = booking;
        if (booking.viewer_role === "host") {
          await api.bookings.startBookingSession(bookingId);
          if (cancelled) return;
          active = { ...booking, status: "live" };
        }

        const session = await api.bookings.attachBookingSession(bookingId);
        if (cancelled) return;
        setPhase({ kind: "ready", booking: active, session });
      } catch (e) {
        if (cancelled) return;
        setPhase({
          kind: "error",
          message: e instanceof ApiError ? e.message : messages.route.joinError,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [api, bookingId, messages.route.joinError, messages.route.notActive, messages.route.notYet, messages.route.passed]);

  // Presence heartbeat while attached to the live session. It is identity-bound to this session_id and
  // MUST stop the moment the viewer leaves: on visibility loss (tab hidden), on navigation/unmount, and
  // it never fires while hidden — so the server promptly sees an absent participant.
  // Reactive control availability — re-renders exactly when slot_start / slot_start+grace pass.
  const controlAvail = useSessionControlAvailability(phase.kind === "ready" ? phase.booking : null);
  const readySessionId = phase.kind === "ready" ? phase.session.session_id : null;
  React.useEffect(() => {
    if (!readySessionId) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let active = true;
    let heartbeatState = initialBookingHeartbeatState(Date.now());
    const beat = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        await api.bookings.heartbeatBookingSession(bookingId, { session_id: readySessionId });
        heartbeatState = bookingHeartbeatSucceeded(heartbeatState, Date.now());
      } catch {
        heartbeatState = bookingHeartbeatFailed(heartbeatState);
      }
      if (active) setAttendanceHealth(bookingHeartbeatHealth(heartbeatState, Date.now()));
    };
    const start = () => { if (!timer) { void beat(); timer = setInterval(() => void beat(), BOOKING_HEARTBEAT_INTERVAL_MS); } };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => { if (document.visibilityState === "hidden") stop(); else start(); };
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof document === "undefined" || document.visibilityState !== "hidden") start();
    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [readySessionId, api, bookingId]);

  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Type as="h1" variant="h2">{messages.route.sessionTitle}</Type>

        {phase.kind === "loading" && (
          <Type variant="body" className="text-muted-foreground">{messages.route.connecting}</Type>
        )}

        {phase.kind === "error" && (
          <div className="space-y-4">
            <Type variant="body" className="text-destructive">{phase.message}</Type>
            <Button
              variant="outline"
              onClick={toBookings}
            >
              {messages.route.back}
            </Button>
          </div>
        )}

        {phase.kind === "not_available" && (
          <div className="space-y-4">
            <Type variant="body" className="text-muted-foreground">{phase.message}</Type>
            <Button variant="outline" onClick={toBookings}>{messages.route.back}</Button>
          </div>
        )}

        {phase.kind === "ready" && (
          <div className="space-y-4">
            {phase.session.agora.app_id ? (
              <VideoStage agora={phase.session.agora} onLeave={toBookings} />
            ) : (
              <div className="rounded-lg border border-border p-6 text-center space-y-2">
                <Type variant="label">{messages.route.videoUnavailableTitle}</Type>
                <Type variant="caption" className="text-muted-foreground">
                  Video session ({phase.session.party}) · channel {phase.session.channel}
                </Type>
                <Type variant="caption" className="text-muted-foreground">
                  {messages.route.videoUnavailable}
                </Type>
              </div>
            )}

            <BookingSessionControls
              attendanceHealth={attendanceHealth}
              copy={messages.session}
              counterpartyName={bookingCounterpartyLabel(phase.booking)}
              onComplete={() => void completeSession()}
              onLeave={toBookings}
              onReviewAttendance={() => void reportNoShow()}
              state={acting ? "settling" : controlAvail.canComplete && controlAvail.canReportNoShow ? "ready-to-settle" : "in-session"}
              viewerRole={phase.booking.viewer_role}
            />
          </div>
        )}
      </div>
    </StandardRoutePage>
  );
}
