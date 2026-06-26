"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { toast } from "@/components/primitives/sonner";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { BookingHold, BookingQuote } from "@/lib/api/bookings-types";
import { useSession } from "@/lib/api/session-store";
import {
  executeUsdcTransfer,
  findConnectedFundingWallet,
  resolveBookingCheckoutTransferInput,
} from "@/lib/commerce/routed-checkout";

type CheckoutPhase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; hold: BookingHold; quote: BookingQuote }
  | { kind: "paying" }
  | { kind: "confirmed"; bookingId: string };

function viewerTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
function formatSlotTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}
function formatDuration(startIso: string, endIso: string): string {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}`.trim();
}
function formatPrice(cents: number): string { return `${(cents / 100).toFixed(2)} USDC`; }
function secondsUntil(isoUtc: string): number {
  return Math.max(0, Math.round((new Date(isoUtc).getTime() - Date.now()) / 1000));
}
function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useCountdown(expiresAtUtc: string | null): number {
  const [secs, setSecs] = React.useState(() => expiresAtUtc ? secondsUntil(expiresAtUtc) : 0);
  React.useEffect(() => {
    if (!expiresAtUtc) return;
    setSecs(secondsUntil(expiresAtUtc));
    const id = setInterval(() => setSecs(secondsUntil(expiresAtUtc)), 1000);
    return () => clearInterval(id);
  }, [expiresAtUtc]);
  return secs;
}

export function BookingCheckoutPage({
  communityId,
  hostUserId,
}: {
  communityId: string;
  hostUserId: string;
}): React.ReactElement {
  const api = useApi();
  const session = useSession();
  const { connectedWallets } = usePiratePrivyWallets({ enabled: true });
  const tz = React.useMemo(viewerTz, []);

  const [phase, setPhase] = React.useState<CheckoutPhase>({ kind: "loading" });

  // Parse slot params passed from the slot picker via URL query.
  const { slotStart, slotEnd } = React.useMemo(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return { slotStart: params.get("start") ?? "", slotEnd: params.get("end") ?? "" };
  }, []);

  const expiresAt = phase.kind === "ready" ? phase.quote.expires_at_utc : null;
  const countdown = useCountdown(expiresAt);

  // Create hold + get quote on mount.
  React.useEffect(() => {
    if (!slotStart || !slotEnd) {
      setPhase({ kind: "error", message: "No slot selected. Please go back and pick a time." });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { hold } = await api.communities.createBookingHold(communityId, hostUserId, {
          slot_start_utc: slotStart,
          slot_end_utc: slotEnd,
        });
        if (cancelled) return;
        const { quote } = await api.communities.quoteBookingHold(communityId, hold.hold_id);
        if (cancelled) return;
        setPhase({ kind: "ready", hold, quote });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof ApiError
          ? e.message
          : "Could not reserve this slot. It may have just been taken — please pick another time.";
        setPhase({ kind: "error", message });
      }
    })();
    return () => { cancelled = true; };
  }, [api, communityId, hostUserId, slotStart, slotEnd]);

  // Auto-navigate back to slot picker when hold expires (give a 5s warning first).
  React.useEffect(() => {
    if (phase.kind !== "ready") return;
    if (countdown === 5) {
      toast.warning("Hold expiring in 5 seconds — returning to slot picker.");
    }
    if (countdown === 0) {
      navigate(`/c/${encodeURIComponent(communityId)}/book/${encodeURIComponent(hostUserId)}`);
    }
  }, [countdown, communityId, hostUserId, phase.kind]);

  const handlePay = React.useCallback(async () => {
    if (phase.kind !== "ready") return;
    const { hold, quote } = phase;

    const walletAttachmentId = session?.user.primary_wallet_attachment;
    if (!walletAttachmentId) {
      toast.error("No wallet attachment found on your account. Add a wallet in settings.");
      return;
    }

    const wallet = findConnectedFundingWallet({
      connectedWallets,
      primaryWalletAddress: session?.profile.primary_wallet_address,
    });
    if (!wallet) {
      toast.error("Connect your primary wallet to pay.");
      return;
    }

    setPhase({ kind: "paying" });
    try {
      const transfer = resolveBookingCheckoutTransferInput(quote.payment);
      const txHash = await executeUsdcTransfer({ transfer, wallet });
      const { booking } = await api.communities.confirmBookingHold(communityId, hold.hold_id, {
        funding_tx_ref: txHash,
        wallet_attachment_id: walletAttachmentId,
      });
      setPhase({ kind: "confirmed", bookingId: booking.booking_id });
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Payment failed. Please try again.";
      toast.error(message);
      // Restore ready state so user can retry.
      setPhase((prev) => prev.kind === "paying"
        ? { kind: "ready", hold: (phase as Extract<CheckoutPhase, { kind: "ready" }>).hold, quote: (phase as Extract<CheckoutPhase, { kind: "ready" }>).quote }
        : prev);
    }
  }, [api, communityId, connectedWallets, phase, session]);

  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Type as="h1" variant="h2">Confirm booking</Type>

        {phase.kind === "loading" && (
          <Type variant="body" className="text-muted-foreground">Reserving your slot…</Type>
        )}

        {phase.kind === "error" && (
          <div className="space-y-4">
            <Type variant="body" className="text-destructive">{phase.message}</Type>
            <Button variant="outline" onClick={() =>
              navigate(`/c/${encodeURIComponent(communityId)}/book/${encodeURIComponent(hostUserId)}`)
            }>
              Back to availability
            </Button>
          </div>
        )}

        {(phase.kind === "ready" || phase.kind === "paying") && (() => {
          const { hold, quote } = phase.kind === "ready"
            ? phase
            : { hold: null as unknown as BookingHold, quote: null as unknown as BookingQuote };
          // When phase = "paying" we still have the hold/quote from before the transition — read from closure.
          const readyPhase = phase.kind === "ready" ? phase : null;
          if (!readyPhase && phase.kind === "paying") {
            return (
              <div className="space-y-4">
                <Type variant="body" className="text-muted-foreground">Processing payment…</Type>
              </div>
            );
          }
          const p = readyPhase!;
          return (
            <div className="space-y-6">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex justify-between">
                  <Type variant="label">Session</Type>
                  <Type variant="body">{formatSlotTime(p.hold.slot_start_utc, tz)}</Type>
                </div>
                <div className="flex justify-between">
                  <Type variant="label">Duration</Type>
                  <Type variant="body">{formatDuration(p.hold.slot_start_utc, p.hold.slot_end_utc)}</Type>
                </div>
                <div className="flex justify-between">
                  <Type variant="label">Total</Type>
                  <Type variant="body">{formatPrice(p.quote.gross_cents)}</Type>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <Type variant="caption">Platform fee ({Math.round(p.quote.platform_fee_bps / 100)}%)</Type>
                  <Type variant="caption">{formatPrice(p.quote.platform_fee_cents)}</Type>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <Type variant="caption">Host receives</Type>
                  <Type variant="caption">{formatPrice(p.quote.host_payout_cents)}</Type>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Type variant="caption" className="text-muted-foreground">Hold reserved for</Type>
                <Type variant="label" className={countdown < 60 ? "text-destructive" : undefined}>
                  {formatCountdown(countdown)}
                </Type>
              </div>

              <Type variant="caption" className="text-muted-foreground">
                Payment held until your session is complete.
              </Type>

              <Button
                className="w-full"
                onClick={() => void handlePay()}
                loading={phase.kind === "paying"}
                disabled={countdown === 0}
              >
                Pay {formatPrice(p.quote.gross_cents)} with USDC
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                disabled={phase.kind === "paying"}
                onClick={() =>
                  navigate(`/c/${encodeURIComponent(communityId)}/book/${encodeURIComponent(hostUserId)}`)
                }
              >
                Cancel
              </Button>
            </div>
          );
        })()}

        {phase.kind === "confirmed" && (
          <div className="space-y-4">
            <Type variant="body">
              Booking confirmed. Your session is reserved and you will receive details shortly.
            </Type>
            <Type variant="caption" className="text-muted-foreground font-mono">
              {phase.bookingId}
            </Type>
            <Button
              variant="outline"
              onClick={() => navigate(`/c/${encodeURIComponent(communityId)}/bookings`)}
            >
              View my bookings
            </Button>
          </div>
        )}
      </div>
    </StandardRoutePage>
  );
}
