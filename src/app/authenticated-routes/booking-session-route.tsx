"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
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
  | { kind: "ready"; booking: BookingView; session: AttachSessionResponse };

export function BookingSessionPage({
  communityId,
  bookingId,
}: {
  communityId: string;
  bookingId: string;
}): React.ReactElement {
  const api = useApi();
  const [phase, setPhase] = React.useState<SessionPhase>({ kind: "loading" });

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

        // Host must call startBookingSession to provision the live room before attaching.
        if (booking.viewer_role === "host") {
          await api.communities.startBookingSession(communityId, bookingId);
          if (cancelled) return;
        }

        const session = await api.communities.attachBookingSession(communityId, bookingId);
        if (cancelled) return;
        setPhase({ kind: "ready", booking, session });
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
            <Button
              variant="outline"
              onClick={() => navigate(`/c/${encodeURIComponent(communityId)}/bookings`)}
            >
              Back to bookings
            </Button>
          </div>
        )}
      </div>
    </StandardRoutePage>
  );
}
