"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { AuthRequiredRouteState } from "@/app/authenticated-helpers/route-shell";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { Type } from "@/components/primitives/type";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import type { BookingCancellationPreview, BookingView, BookingStatus } from "@/lib/api/bookings-types";

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
function bookingsPath(role: "host" | "booker", sourceCommunityId?: string | null): string {
  const params = new URLSearchParams({ role });
  if (sourceCommunityId) {
    params.set("source_community_id", sourceCommunityId);
  }
  return `/bookings?${params.toString()}`;
}

function isUpcoming(b: BookingView): boolean {
  return b.status === "confirmed" || b.status === "live";
}
function isCancellable(b: BookingView): boolean {
  return b.status === "confirmed";
}
export function isJoinable(b: BookingView, now: number): boolean {
  if (b.status !== "confirmed" && b.status !== "live") return false;
  const start = new Date(b.slot_start_utc).getTime();
  const end = new Date(b.slot_end_utc).getTime();
  return now >= start - 5 * 60_000 && now < end;
}
export function groupBookings(bookings: BookingView[]): {
  upcoming: BookingView[];
  past: BookingView[];
  cancelled: BookingView[];
  review: BookingView[];
} {
  const upcoming: BookingView[] = [];
  const past: BookingView[] = [];
  const cancelled: BookingView[] = [];
  const review: BookingView[] = [];
  for (const b of bookings) {
    if (b.status === "disputed" || b.settlement_status === "disputed") {
      review.push(b);
    } else if (b.outcome === "cancelled_by_host" || b.outcome === "cancelled_by_booker" || ["cancelled_by_host", "cancelled_by_booker", "cancelled_before_payment", "expired_hold"].includes(b.status)) {
      cancelled.push(b);
    } else if (b.outcome != null || ["completed", "settled", "refunded", "no_show_host", "no_show_booker"].includes(b.status)) {
      past.push(b);
    } else {
      upcoming.push(b);
    }
  }
  return { upcoming, past, cancelled, review };
}

function statusLabel(booking: BookingView): string {
  const outcomeLabels = {
    completed: "Completed",
    no_show_host: "Host no-show",
    no_show_booker: "Booker no-show",
    cancelled_by_host: "Cancelled by host",
    cancelled_by_booker: "Cancelled by booker",
  } as const;
  if (booking.outcome) {
    const label = outcomeLabels[booking.outcome];
    return booking.settlement_status === "settling" ? `${label} · settling` : label;
  }
  const status = booking.status;
  const labels: Partial<Record<BookingStatus, string>> = {
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

function useBookingJoinClock(bookings: BookingView[]): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const boundaries = bookings.flatMap((booking) => {
      if (booking.status !== "confirmed" && booking.status !== "live") return [];
      return [new Date(booking.slot_start_utc).getTime() - 5 * 60_000, new Date(booking.slot_end_utc).getTime()];
    }).filter((boundary) => boundary > now);
    if (boundaries.length === 0) return;
    const next = Math.min(...boundaries);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, next - Date.now()) + 100);
    return () => clearTimeout(timer);
  }, [bookings, now]);
  return now;
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
  previewing,
  now,
}: {
  booking: BookingView;
  tz: string;
  onCancel: (booking: BookingView) => void;
  cancelling: boolean;
  previewing: boolean;
  now: number;
}): React.ReactElement {
  const joinable = isJoinable(booking, now);
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
          {statusLabel(booking)}
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
            onClick={() => navigate(`/bookings/${encodeURIComponent(booking.booking_id)}/session`)}
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
            disabled={previewing}
            onClick={() => onCancel(booking)}
          >
            {previewing ? "Checking terms…" : "Cancel"}
          </Button>
        )}
      </div>
    </div>
  );
}

// --- page ---

export function BookingManagementPage({
  sourceCommunityId,
  role,
}: {
  sourceCommunityId?: string | null;
  role: "host" | "booker";
}): React.ReactElement {
  const session = useSession();
  if (!session?.accessToken) {
    return <AuthRequiredRouteState title="My bookings" description="Sign in to view and manage your bookings." />;
  }
  return <BookingManagementContent sourceCommunityId={sourceCommunityId} role={role} />;
}

function BookingManagementContent({
  sourceCommunityId,
  role,
}: {
  sourceCommunityId?: string | null;
  role: "host" | "booker";
}): React.ReactElement {
  const api = useApi();
  const tz = React.useMemo(viewerTz, []);
  const [bookings, setBookings] = React.useState<BookingView[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [cancellation, setCancellation] = React.useState<{ booking: BookingView; preview: BookingCancellationPreview } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.bookings.listBookings({ role, source_community_id: sourceCommunityId });
      setBookings(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your bookings.");
    } finally {
      setLoading(false);
    }
  }, [api, sourceCommunityId, role]);

  React.useEffect(() => { void load(); }, [load]);

  const requestCancellation = React.useCallback(async (booking: BookingView) => {
    setPreviewingId(booking.booking_id);
    try {
      const preview = await api.bookings.getBookingCancellationPreview(booking.booking_id);
      setCancellation({ booking, preview });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not check cancellation terms.");
    } finally {
      setPreviewingId(null);
    }
  }, [api]);

  const handleCancel = React.useCallback(async () => {
    if (!cancellation) return;
    setCancellingId(cancellation.booking.booking_id);
    try {
      await api.bookings.cancelBooking(cancellation.booking.booking_id, cancellation.preview.refund_cents);
      toast.success("Booking cancelled.");
      setCancellation(null);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.code === "cancellation_terms_changed") {
        try {
          const preview = await api.bookings.getBookingCancellationPreview(cancellation.booking.booking_id);
          setCancellation({ booking: cancellation.booking, preview });
          toast.error("Cancellation terms changed. Review the updated amounts.");
          return;
        } catch { /* surface the original error below */ }
      }
      toast.error(e instanceof ApiError ? e.message : "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  }, [api, cancellation, load]);

  const { upcoming, past, cancelled, review } = React.useMemo(
    () => groupBookings(bookings ?? []),
    [bookings],
  );
  const joinNow = useBookingJoinClock(bookings ?? []);

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
            <Button variant="outline" size="sm" onClick={() => navigate(bookingsPath("booker", sourceCommunityId))}>
              As booker
            </Button>
          </div>
        )}
        {role === "booker" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(bookingsPath("host", sourceCommunityId))}>
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
                    onCancel={(booking) => void requestCancellation(booking)}
                    cancelling={cancellingId === b.booking_id}
                    previewing={previewingId === b.booking_id}
                    now={joinNow}
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
                    onCancel={(booking) => void requestCancellation(booking)}
                    cancelling={cancellingId === b.booking_id}
                    previewing={previewingId === b.booking_id}
                    now={joinNow}
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
                    onCancel={(booking) => void requestCancellation(booking)}
                    cancelling={cancellingId === b.booking_id}
                    previewing={previewingId === b.booking_id}
                    now={joinNow}
                  />
                ))}
              </div>
            )}

            {review.length > 0 && (
              <div className="space-y-3">
                <Type variant="label">Under review</Type>
                {review.map((b) => (
                  <BookingCard
                    key={b.booking_id}
                    booking={b}
                    tz={tz}
                    onCancel={(booking) => void requestCancellation(booking)}
                    cancelling={cancellingId === b.booking_id}
                    previewing={previewingId === b.booking_id}
                    now={joinNow}
                  />
                ))}
              </div>
            )}

            {upcoming.length === 0 && past.length === 0 && cancelled.length === 0 && review.length === 0 && (
              <Type variant="body" className="text-muted-foreground">
                No bookings yet.
              </Type>
            )}
          </>
        )}
      </div>
      <Dialog open={cancellation != null} onOpenChange={(open) => { if (!open && !cancellingId) setCancellation(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              Review the financial result before confirming. Cancellation cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {cancellation ? (
            <div className="space-y-3">
              <div className="flex justify-between gap-4"><Type variant="body">Paid</Type><Type variant="body-strong">{formatPrice(cancellation.preview.gross_cents)}</Type></div>
              <div className="flex justify-between gap-4"><Type variant="body">Booker refund</Type><Type variant="body-strong">{formatPrice(cancellation.preview.refund_cents)}</Type></div>
              <div className="flex justify-between gap-4"><Type variant="body">Host receives</Type><Type variant="body-strong">{formatPrice(cancellation.preview.host_payout_cents)}</Type></div>
              {cancellation.preview.policy_cutoff_at ? (
                <Type variant="caption" className="text-muted-foreground">
                  Full refunds apply until {formatDateTime(cancellation.preview.policy_cutoff_at, tz)}.
                </Type>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(cancellingId)} onClick={() => setCancellation(null)}>Keep booking</Button>
            <Button variant="destructive" loading={Boolean(cancellingId)} onClick={() => void handleCancel()}>Confirm cancellation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandardRoutePage>
  );
}
