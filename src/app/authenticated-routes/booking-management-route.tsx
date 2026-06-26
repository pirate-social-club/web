"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { BookingView, BookingStatus } from "@/lib/api/bookings-types";

// --- helpers ---

function viewerTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
function formatDateTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}
function formatDuration(startIso: string, endIso: string): string {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}`;
}
function formatPrice(cents: number): string { return `${(cents / 100).toFixed(2)} USDC`; }

function isUpcoming(b: BookingView): boolean {
  return b.status === "confirmed" || b.status === "live";
}
function isCancellable(b: BookingView): boolean {
  return b.status === "confirmed";
}
function isJoinable(b: BookingView): boolean {
  if (b.status !== "confirmed") return false;
  const now = Date.now();
  const start = new Date(b.slot_start_utc).getTime();
  const end = new Date(b.slot_end_utc).getTime();
  return now >= start - 5 * 60_000 && now < end;
}
function groupBookings(bookings: BookingView[]): {
  upcoming: BookingView[];
  past: BookingView[];
  cancelled: BookingView[];
} {
  const upcoming: BookingView[] = [];
  const past: BookingView[] = [];
  const cancelled: BookingView[] = [];
  for (const b of bookings) {
    if (["cancelled_by_host", "cancelled_by_booker", "cancelled_before_payment", "expired_hold", "refunded", "no_show_host", "no_show_booker", "disputed"].includes(b.status)) {
      cancelled.push(b);
    } else if (["completed", "settled"].includes(b.status)) {
      past.push(b);
    } else {
      upcoming.push(b);
    }
  }
  return { upcoming, past, cancelled };
}

function statusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    confirmed: "Confirmed",
    live: "In progress",
    completed: "Completed",
    settled: "Settled",
    refunded: "Refunded",
    no_show_host: "Host no-show",
    no_show_booker: "No-show",
    cancelled_by_host: "Cancelled by host",
    cancelled_by_booker: "Cancelled",
  };
  return labels[status] ?? status;
}

// Generates a .ics file and triggers a download.
function downloadIcs(booking: BookingView, tz: string): void {
  const dtFormat = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const summary = `Booking session`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pirate//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:${booking.booking_id}@pirate`,
    `DTSTAMP:${dtFormat(new Date().toISOString())}`,
    `DTSTART:${dtFormat(booking.slot_start_utc)}`,
    `DTEND:${dtFormat(booking.slot_end_utc)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:Booking ID: ${booking.booking_id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `booking-${booking.booking_id.slice(0, 8)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- card ---

function BookingCard({
  booking,
  tz,
  onCancel,
  cancelling,
}: {
  booking: BookingView;
  tz: string;
  onCancel: (bookingId: string) => void;
  cancelling: boolean;
}): React.ReactElement {
  const joinable = isJoinable(booking);
  const cancellable = isCancellable(booking);
  const showCalendar = ["confirmed", "live", "completed", "settled"].includes(booking.status);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <Type variant="label">{formatDateTime(booking.slot_start_utc, tz)}</Type>
          <Type variant="caption" className="text-muted-foreground">
            {formatDuration(booking.slot_start_utc, booking.slot_end_utc)} · {tz}
          </Type>
        </div>
        <Type variant="caption" className="text-muted-foreground shrink-0">
          {statusLabel(booking.status)}
        </Type>
      </div>

      <div className="flex justify-between text-muted-foreground">
        <Type variant="caption">Total</Type>
        <Type variant="caption">{formatPrice(booking.gross_cents)}</Type>
      </div>

      {booking.refund_cents != null && booking.refund_cents > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <Type variant="caption">Refund</Type>
          <Type variant="caption">{formatPrice(booking.refund_cents)}</Type>
        </div>
      )}

      <Type variant="caption" className="text-muted-foreground font-mono">
        {booking.booking_id}
      </Type>

      <div className="flex flex-wrap gap-2 pt-1">
        {joinable && (
          <Button
            size="sm"
            onClick={() => navigate(`/c/${encodeURIComponent(booking.community_id)}/bookings/${encodeURIComponent(booking.booking_id)}/session`)}
          >
            Join session
          </Button>
        )}
        {showCalendar && (
          <Button size="sm" variant="outline" onClick={() => downloadIcs(booking, tz)}>
            Add to calendar
          </Button>
        )}
        {cancellable && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            loading={cancelling}
            onClick={() => onCancel(booking.booking_id)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// --- page ---

export function BookingManagementPage({
  communityId,
  role,
}: {
  communityId: string;
  role: "host" | "booker";
}): React.ReactElement {
  const api = useApi();
  const tz = React.useMemo(viewerTz, []);
  const [bookings, setBookings] = React.useState<BookingView[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.communities.listBookings(communityId, { role });
      setBookings(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your bookings.");
    } finally {
      setLoading(false);
    }
  }, [api, communityId, role]);

  React.useEffect(() => { void load(); }, [load]);

  const handleCancel = React.useCallback(async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await api.communities.cancelBooking(communityId, bookingId);
      toast.success("Booking cancelled.");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  }, [api, communityId, load]);

  const { upcoming, past, cancelled } = React.useMemo(
    () => groupBookings(bookings ?? []),
    [bookings],
  );

  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Type as="h1" variant="h2">
            {role === "host" ? "My sessions" : "My bookings"}
          </Type>
          <Button variant="ghost" size="sm" onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        </div>

        {role === "host" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/c/${encodeURIComponent(communityId)}/bookings?role=booker`)}>
              As booker
            </Button>
          </div>
        )}
        {role === "booker" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/c/${encodeURIComponent(communityId)}/bookings?role=host`)}>
              As host
            </Button>
          </div>
        )}

        {loading && !bookings && (
          <Type variant="body" className="text-muted-foreground">Loading…</Type>
        )}
        {error && (
          <Type variant="body" className="text-destructive">{error}</Type>
        )}

        {bookings != null && (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <Type variant="label">Upcoming</Type>
                {upcoming.map((b) => (
                  <BookingCard
                    key={b.booking_id}
                    booking={b}
                    tz={tz}
                    onCancel={(id) => void handleCancel(id)}
                    cancelling={cancellingId === b.booking_id}
                  />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-3">
                <Type variant="label">Past</Type>
                {past.map((b) => (
                  <BookingCard
                    key={b.booking_id}
                    booking={b}
                    tz={tz}
                    onCancel={(id) => void handleCancel(id)}
                    cancelling={cancellingId === b.booking_id}
                  />
                ))}
              </div>
            )}

            {cancelled.length > 0 && (
              <div className="space-y-3">
                <Type variant="label">Cancelled</Type>
                {cancelled.map((b) => (
                  <BookingCard
                    key={b.booking_id}
                    booking={b}
                    tz={tz}
                    onCancel={(id) => void handleCancel(id)}
                    cancelling={cancellingId === b.booking_id}
                  />
                ))}
              </div>
            )}

            {upcoming.length === 0 && past.length === 0 && cancelled.length === 0 && (
              <Type variant="body" className="text-muted-foreground">
                No bookings yet.
              </Type>
            )}
          </>
        )}
      </div>
    </StandardRoutePage>
  );
}
