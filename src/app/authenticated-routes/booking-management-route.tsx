"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { bookingCounterpartyLabel, formatBookingTimeRange, toBookingManagementItem } from "@/app/authenticated-helpers/booking-management-view-model";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { BookingCancellationDialog, type BookingCancellationDialogState } from "@/components/compositions/bookings/booking-cancellation-dialog/booking-cancellation-dialog";
import { BookingManagementView, type BookingManagementItem } from "@/components/compositions/bookings/booking-management-view/booking-management-view";
import { nextBookingJoinBoundary } from "@/components/compositions/bookings/booking-management-view/booking-management-policy";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { toast } from "@/components/primitives/sonner";
import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/api/session-store";
import type {
  BookingCancellationPreview,
  BookingView,
  PendingBookingPaymentIntent,
} from "@/lib/api/bookings-types";

function viewerTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

function bookingsPath(role: "host" | "booker", sourceCommunityId?: string | null): string {
  const params = new URLSearchParams({ role });
  if (sourceCommunityId) params.set("source_community_id", sourceCommunityId);
  return `/bookings?${params.toString()}`;
}

function downloadIcs(booking: BookingView): void {
  const dt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pirate//Bookings//EN", "BEGIN:VEVENT",
    `UID:${booking.booking_id}@pirate`, `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(booking.slot_start_utc)}`, `DTEND:${dt(booking.slot_end_utc)}`,
    "SUMMARY:Booking session", `DESCRIPTION:Booking ID: ${booking.booking_id}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `booking-${booking.booking_id.slice(0, 8)}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isCancellationPreview(value: unknown): value is BookingCancellationPreview {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BookingCancellationPreview>;
  return candidate.object === "booking_cancellation_preview" && typeof candidate.refund_cents === "number";
}

export function BookingManagementPage({ sourceCommunityId, role }: {
  sourceCommunityId?: string | null;
  role: "host" | "booker";
}): React.ReactElement {
  const api = useApi();
  const session = useSession();
  const { connect } = usePiratePrivyRuntime();
  const { copy, localeTag } = useRouteMessages();
  const messages = copy.bookingManagement;
  const timeZone = React.useMemo(viewerTz, []);
  const [bookings, setBookings] = React.useState<BookingView[] | null>(null);
  const [pendingPayments, setPendingPayments] = React.useState<PendingBookingPaymentIntent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [cancelBooking, setCancelBooking] = React.useState<BookingView | null>(null);
  const [preview, setPreview] = React.useState<BookingCancellationPreview | null>(null);
  const [dialogState, setDialogState] = React.useState<BookingCancellationDialogState>("ready");
  const [dialogError, setDialogError] = React.useState<string | undefined>();

  const load = React.useCallback(async () => {
    if (!session?.profile) { setLoading(false); setBookings(null); return; }
    setLoading(true); setError(null);
    try {
      const [response, pending] = await Promise.all([
        api.bookings.listBookings({ role, source_community_id: sourceCommunityId }),
        role === "booker"
          ? api.bookings.listPendingBookingPaymentIntents().catch(() => ({ object: "list" as const, data: [], has_more: false }))
          : Promise.resolve({ object: "list" as const, data: [], has_more: false }),
      ]);
      setBookings(response.data);
      setPendingPayments(pending.data.filter((intent) =>
        intent.resume_state === "confirmable"
        || intent.resume_state === "finalizable"
        || intent.resume_state === "refund_pending"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : messages.route.loadError);
    } finally { setLoading(false); }
  }, [api, messages.route.loadError, role, session?.profile, sourceCommunityId]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    const boundary = nextBookingJoinBoundary(bookings ?? [], nowMs);
    if (boundary == null) return;
    const timer = setTimeout(() => setNowMs(Date.now()), Math.max(0, boundary - Date.now()) + 200);
    return () => clearTimeout(timer);
  }, [bookings, nowMs]);

  const byId = React.useMemo(() => new Map((bookings ?? []).map((booking) => [booking.booking_id, booking])), [bookings]);
  const items = React.useMemo(() => (bookings ?? []).map((booking) => toBookingManagementItem(booking, {
    locale: localeTag, timeZone, nowMs, messages: messages.status,
  })), [bookings, localeTag, messages.status, nowMs, timeZone]);

  const openCancellation = React.useCallback(async (item: BookingManagementItem) => {
    const booking = byId.get(item.id);
    if (!booking) return;
    setCancelBooking(booking); setDialogError(undefined); setDialogState("ready");
    try { setPreview(await api.bookings.getBookingCancellationPreview(booking.booking_id)); }
    catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : messages.route.previewError);
      setCancelBooking(null);
    }
  }, [api, byId, messages.route.previewError]);

  const confirmCancellation = React.useCallback(async (expectedRefundCents: number) => {
    if (!cancelBooking) return;
    setDialogState("submitting"); setDialogError(undefined);
    try {
      await api.bookings.cancelBooking(cancelBooking.booking_id, expectedRefundCents);
      toast.success(messages.route.cancelledToast);
      setCancelBooking(null); setPreview(null);
      await load();
    } catch (cause) {
      const freshPreview = cause instanceof ApiError ? cause.details?.preview : null;
      const changed = cause instanceof ApiError && cause.status === 409 && isCancellationPreview(freshPreview);
      if (changed) { setPreview(freshPreview); setDialogState("terms-changed"); }
      else { setDialogState("error"); setDialogError(cause instanceof ApiError ? cause.message : messages.route.cancelError); }
    }
  }, [api, cancelBooking, load, messages.route.cancelError, messages.route.cancelledToast]);

  const selectedLabel = cancelBooking
    ? formatBookingTimeRange(cancelBooking.slot_start_utc, cancelBooking.slot_end_utc, localeTag, timeZone)
    : "";
  const cutoffLabel = preview?.policy_cutoff_at
    ? new Intl.DateTimeFormat(localeTag, { timeZone, dateStyle: "long", timeStyle: "short" }).format(new Date(preview.policy_cutoff_at))
    : undefined;

  return (
    <StandardRoutePage size="rail">
      <div className="p-6">
        {pendingPayments.length > 0 ? (
          <div className="mx-auto mb-6 flex w-full max-w-2xl flex-col gap-3">
            {pendingPayments.map((intent) => (
              <Card key={intent.payment_intent_id}>
                <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <Type variant="body-strong">
                      {intent.resume_state === "refund_pending"
                        ? messages.view.refundPendingTitle
                        : messages.view.paymentInProgress}
                    </Type>
                    <Type variant="caption">
                      {intent.resume_state === "refund_pending"
                        ? messages.view.refundPendingDetail
                        : messages.view.paymentResumeDetail}
                    </Type>
                  </div>
                  {intent.resume_state !== "refund_pending" ? (
                    <Button onClick={() => navigate(
                      `/book/${encodeURIComponent(intent.host_user_id)}/checkout?${new URLSearchParams({
                        start: intent.slot_start_utc,
                        end: intent.slot_end_utc,
                      }).toString()}`,
                    )}>
                      {messages.view.resumePayment}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
        <BookingManagementView
          copy={messages.view}
          errorMessage={error ?? undefined}
          items={items}
          onAddToCalendar={(item) => { const booking = byId.get(item.id); if (booking) downloadIcs(booking); }}
          onCancel={(item) => void openCancellation(item)}
          onJoin={(item) => navigate(`/bookings/${encodeURIComponent(item.id)}/session`)}
          onRetry={() => void load()}
          onRoleChange={(nextRole) => navigate(bookingsPath(nextRole, sourceCommunityId))}
          onSignIn={() => connect?.()}
          role={role}
          state={!session?.profile ? "signed-out" : loading && !bookings ? "loading" : error ? "error" : items.length === 0 ? "empty" : "ready"}
        />
      </div>
      {cancelBooking && preview ? (
        <BookingCancellationDialog
          copy={messages.dialog}
          counterpartyName={bookingCounterpartyLabel(cancelBooking)}
          errorMessage={dialogError}
          onConfirm={(amount) => void confirmCancellation(amount)}
          onOpenChange={(open) => { if (!open && dialogState !== "submitting") { setCancelBooking(null); setPreview(null); } }}
          open
          policyCutoffLabel={cutoffLabel}
          preview={preview}
          sessionTimeLabel={selectedLabel}
          state={dialogState}
        />
      ) : null}
    </StandardRoutePage>
  );
}
