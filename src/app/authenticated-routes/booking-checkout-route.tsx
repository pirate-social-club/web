"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { useApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { BookingHold, BookingQuote, PendingBookingPaymentIntent } from "@/lib/api/bookings-types";
import { useSession } from "@/lib/api/session-store";
import { useRequestAuth } from "@/hooks/use-request-auth";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { interpolateMessage } from "@/lib/route-messages";
import {
  executeUsdcTransfer,
  findConnectedFundingWallet,
  resolveBookingCheckoutTransferInput,
} from "@/lib/commerce/routed-checkout";

// Crash-recovery: the hold/intent ids, the chosen wallet attachment, and — critically — the submitted
// transaction hash are persisted to sessionStorage so a reload resumes API CONFIRMATION ONLY and never
// submits a second on-chain transfer. Keyed by the exact slot so a refresh maps to the same attempt.
const PERSIST_PREFIX = "pirate:booking-checkout:v1";
interface PersistedCheckout {
  holdId: string;
  paymentIntentId: string;
  walletAttachmentId?: string;
  txHash?: string;
  bookingId?: string;
}
function persistKey(communityId: string | null, hostUserId: string, slotStart: string): string {
  return `${PERSIST_PREFIX}:${communityId ?? "global"}:${hostUserId}:${slotStart}`;
}
function loadPersisted(key: string): PersistedCheckout | null {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as PersistedCheckout) : null;
  } catch { return null; }
}
function savePersisted(key: string, patch: Partial<PersistedCheckout>): void {
  try {
    const cur = loadPersisted(key) ?? {};
    sessionStorage.setItem(key, JSON.stringify({ ...cur, ...patch }));
  } catch { /* sessionStorage unavailable — degrade to in-memory only */ }
}
function clearPersisted(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* noop */ }
}

// Terminal vs resumable confirmation reasons (from the API confirm contract, surfaced as ApiError.code).
const RESUMABLE_CONFIRM_CODES = new Set(["payment_pending", "verification_in_progress"]);
const EXPIRED_CONFIRM_CODES = new Set(["hold_expired", "hold_not_found", "hold_not_active"]);
const TERMINAL_CONFIRM_CODES = new Set([
  "payment_rejected", "transaction_already_used", "replay_mismatch", "finalization_conflict", "wallet_attachment_invalid",
]);

type Phase =
  | { kind: "holding" }
  | { kind: "quoted"; hold: BookingHold; quote: BookingQuote }
  | { kind: "wallet_required"; hold: BookingHold; quote: BookingQuote; message: string }
  | { kind: "paying"; hold: BookingHold; quote: BookingQuote }
  | { kind: "confirming"; txHash: string }
  | { kind: "confirmed"; bookingId: string }
  | { kind: "refund_pending"; txHash: string }
  | { kind: "expired" }
  | {
      kind: "failed";
      message: string;
      hold?: BookingHold;
      quote?: BookingQuote;
      canRetryPay?: boolean;
      canRetryConfirm?: boolean;
      txHash?: string;
      walletAttachmentId?: string;
    };

function viewerTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

function pendingIntentForCheckout(
  intents: PendingBookingPaymentIntent[],
  hostUserId: string,
  slotStart: string,
): PendingBookingPaymentIntent | null {
  return intents.find((intent) => intent.host_user_id === hostUserId && intent.slot_start_utc === slotStart)
    ?? intents.find((intent) => intent.host_user_id === hostUserId)
    ?? intents.find((intent) => intent.resume_state !== "payable")
    ?? null;
}

function holdFromPending(intent: PendingBookingPaymentIntent): BookingHold {
  return {
    hold_id: intent.hold_id,
    source_community_id: null,
    host_user_id: intent.host_user_id,
    booker_user_id: "",
    slot_start_utc: intent.slot_start_utc,
    slot_end_utc: intent.slot_end_utc,
    price_cents: intent.payment.gross_cents,
    status: "active",
    expires_at_utc: intent.hold_expires_at,
  };
}
function formatSlotTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
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
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}
function useCountdown(expiresAtUtc: string | null): number {
  // Derive the remaining seconds synchronously from the target on every render; the interval only forces
  // a re-render each second. Deriving (rather than holding it in state seeded at mount) is what prevents
  // the expiry race: when the checkout enters the quoted phase, expiresAtUtc goes null -> a real
  // timestamp, and the countdown reflects the fresh quote IMMEDIATELY instead of a stale 0 that would
  // make the "quoted && countdown === 0" guard fire and flip the screen to "expired" before paying.
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    if (!expiresAtUtc) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtUtc]);
  return expiresAtUtc ? secondsUntil(expiresAtUtc) : 0;
}

export function BookingCheckoutPage({ communityId, hostUserId }: { communityId: string | null; hostUserId: string }): React.ReactElement {
  const api = useApi();
  const session = useSession();
  const requestAuth = useRequestAuth();
  const { copy } = useRouteMessages();
  const messages = copy.bookingCheckout;
  const isAuthed = Boolean(session?.accessToken);
  const { connectedWallets } = usePiratePrivyWallets({ enabled: true });
  const tz = React.useMemo(viewerTz, []);
  const [phase, setPhase] = React.useState<Phase>({ kind: "holding" });

  const { slotStart, slotEnd } = React.useMemo(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return { slotStart: params.get("start") ?? "", slotEnd: params.get("end") ?? "" };
  }, []);
  const key = persistKey(communityId, hostUserId, slotStart);

  const backToAvailability = React.useCallback(() => {
    navigate(communityId
      ? `/c/${encodeURIComponent(communityId)}/book/${encodeURIComponent(hostUserId)}`
      : `/book/${encodeURIComponent(hostUserId)}`);
  }, [communityId, hostUserId]);

  // Modal-first: a logged-out arrival (e.g. a deep-linked checkout URL) auto-opens the Privy sign-in
  // modal once, so the primary path is the same modal the rest of the app uses. The "Sign in to
  // continue" screen below is only the quiet fallback if the modal can't open or the user dismisses it.
  const autoPrompted = React.useRef(false);
  React.useEffect(() => {
    if (isAuthed) { autoPrompted.current = false; return; }
    if (autoPrompted.current) return;
    autoPrompted.current = true;
    requestAuth(messages.signInToBookThisSession);
  }, [isAuthed, messages.signInToBookThisSession, requestAuth]);

  // Run API confirmation for an ALREADY-submitted transaction. Pure resume — never submits a transfer.
  const runConfirm = React.useCallback(async (holdId: string, txHash: string, walletAttachmentId: string) => {
    setPhase({ kind: "confirming", txHash });
    try {
      const { booking } = await api.bookings.confirmBookingHold(holdId, {
        funding_tx_ref: txHash, wallet_attachment_id: walletAttachmentId,
      });
      savePersisted(key, { bookingId: booking.booking_id });
      setPhase({ kind: "confirmed", bookingId: booking.booking_id });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "unknown";
      if (EXPIRED_CONFIRM_CODES.has(code)) { clearPersisted(key); setPhase({ kind: "expired" }); return; }
      if (TERMINAL_CONFIRM_CODES.has(code)) {
        const message = code === "payment_rejected"
          ? messages.paymentMismatch
          : code === "transaction_already_used"
            ? messages.transactionAlreadyUsed
            : messages.confirmFailed;
        setPhase({ kind: "failed", message, canRetryConfirm: false });
        return;
      }
      // Resumable: payment pending on-chain, or a transient API/network error. Keep the tx hash so the
      // user can retry confirmation WITHOUT paying again.
      const message = RESUMABLE_CONFIRM_CODES.has(code)
        ? messages.paymentPending
        : (e instanceof ApiError ? e.message : messages.confirmServerError);
      setPhase({ kind: "failed", message, canRetryConfirm: true, txHash, walletAttachmentId });
    }
  }, [api, key, messages]);

  // Mount: consult the server before creating a hold. sessionStorage remains the fast local recovery
  // record, but the durable claim wins when the two disagree.
  React.useEffect(() => {
    // Never touch the authenticated hold/quote APIs while logged out — the render shows a sign-in state
    // instead. Once the user signs in (session.accessToken appears), isAuthed flips and this re-runs.
    if (!isAuthed) return;
    if (!slotStart || !slotEnd) {
      setPhase({ kind: "failed", message: messages.noSlotSelected });
      return;
    }
    let cancelled = false;
    void (async () => {
      const saved = loadPersisted(key);
      if (saved?.bookingId) { setPhase({ kind: "confirmed", bookingId: saved.bookingId }); return; }

      let serverIntent: PendingBookingPaymentIntent | null = null;
      try {
        const pending = await api.bookings.listPendingBookingPaymentIntents();
        if (cancelled) return;
        serverIntent = pendingIntentForCheckout(pending.data, hostUserId, slotStart);
      } catch (error) {
        if (cancelled) return;
        // A surviving local tx is still safe to confirm. With no durable or local evidence, fail
        // closed: creating a hold while discovery is unavailable could invite a second payment.
        if (!(saved?.holdId && saved.txHash && saved.walletAttachmentId)) {
          setPhase({
            kind: "failed",
            message: error instanceof ApiError ? error.message : messages.resumeLookupFailed,
          });
          return;
        }
      }

      if (serverIntent?.resume_state === "booked" && serverIntent.booking_id) {
        savePersisted(key, { bookingId: serverIntent.booking_id });
        setPhase({ kind: "confirmed", bookingId: serverIntent.booking_id });
        return;
      }
      if (serverIntent?.resume_state === "refund_pending") {
        setPhase({ kind: "refund_pending", txHash: serverIntent.claimed_tx_ref ?? "" });
        return;
      }
      if (
        serverIntent
        && (serverIntent.resume_state === "confirmable" || serverIntent.resume_state === "finalizable")
        && serverIntent.claimed_tx_ref
        && serverIntent.wallet_attachment_id
      ) {
        if (saved?.txHash && saved.txHash.toLowerCase() !== serverIntent.claimed_tx_ref.toLowerCase()) {
          console.warn("[booking-checkout] local payment differs from durable server claim", {
            holdId: serverIntent.hold_id,
            localTxRef: saved.txHash,
            serverTxRef: serverIntent.claimed_tx_ref,
          });
        }
        savePersisted(key, {
          holdId: serverIntent.hold_id,
          paymentIntentId: serverIntent.payment_intent_id,
          txHash: serverIntent.claimed_tx_ref,
          walletAttachmentId: serverIntent.wallet_attachment_id,
        });
        await runConfirm(
          serverIntent.hold_id,
          serverIntent.claimed_tx_ref,
          serverIntent.wallet_attachment_id,
        );
        return;
      }

      if (saved?.holdId && saved?.txHash && saved?.walletAttachmentId) {
        await runConfirm(saved.holdId, saved.txHash, saved.walletAttachmentId);
        return;
      }

      const resumableHoldId = serverIntent?.resume_state === "payable"
        ? serverIntent.hold_id
        : saved?.holdId;
      if (resumableHoldId) {
        try {
          const { quote } = await api.bookings.quoteBookingHold(resumableHoldId);
          if (cancelled) return;
          const hold = serverIntent?.resume_state === "payable"
            ? holdFromPending(serverIntent)
            : { hold_id: resumableHoldId, slot_start_utc: slotStart, slot_end_utc: slotEnd } as BookingHold;
          savePersisted(key, { holdId: resumableHoldId, paymentIntentId: quote.payment.payment_intent_id });
          setPhase({ kind: "quoted", hold, quote });
          return;
        } catch (e) {
          if (cancelled) return;
          const code = e instanceof ApiError ? e.code : "";
          if (EXPIRED_CONFIRM_CODES.has(code)) { clearPersisted(key); setPhase({ kind: "expired" }); return; }
          // A stale local hold can be replaced only after server discovery proved no money claim exists.
        }
      }
      // Fresh: create the hold + quote.
      try {
        const { hold } = await api.bookings.createBookingHold(hostUserId, {
          slot_start_utc: slotStart,
          slot_end_utc: slotEnd,
          source_community_id: communityId ?? null,
        });
        if (cancelled) return;
        const { quote } = await api.bookings.quoteBookingHold(hold.hold_id);
        if (cancelled) return;
        savePersisted(key, { holdId: hold.hold_id, paymentIntentId: quote.payment.payment_intent_id });
        setPhase({ kind: "quoted", hold, quote });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof ApiError ? e.message : messages.reserveFailed;
        setPhase({ kind: "failed", message });
      }
    })();
    return () => { cancelled = true; };
  }, [api, communityId, hostUserId, slotStart, slotEnd, key, messages.noSlotSelected, messages.reserveFailed, messages.resumeLookupFailed, runConfirm, isAuthed]);

  const expiresAt = phase.kind === "quoted" ? phase.quote.expires_at_utc : null;
  const countdown = useCountdown(expiresAt);
  // Expire ONLY while still on the payable screen — never while a transfer/confirmation is in flight.
  React.useEffect(() => {
    if (phase.kind === "quoted" && countdown === 0) { clearPersisted(key); setPhase({ kind: "expired" }); }
  }, [countdown, phase.kind, key]);

  const handlePay = React.useCallback(async (hold: BookingHold, quote: BookingQuote) => {
    // Resolve the wallet attachment server-authoritatively (the booker's primary attachment), and verify
    // the CONNECTED wallet matches that attachment's address before paying.
    const walletAttachmentId = session?.user.primary_wallet_attachment;
    if (!walletAttachmentId) {
      setPhase({ kind: "wallet_required", hold, quote, message: messages.noWalletAttached });
      return;
    }
    const wallet = findConnectedFundingWallet({ connectedWallets, primaryWalletAddress: session?.profile.primary_wallet_address });
    if (!wallet) {
      setPhase({ kind: "wallet_required", hold, quote, message: messages.connectWallet });
      return;
    }

    // Re-fetch the quote authoritatively right before this irreversible action (hold may have expired,
    // payment instructions are taken fresh from the server).
    let fresh: BookingQuote;
    try {
      fresh = (await api.bookings.quoteBookingHold(hold.hold_id)).quote;
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      if (EXPIRED_CONFIRM_CODES.has(code)) { clearPersisted(key); setPhase({ kind: "expired" }); return; }
      setPhase({ kind: "failed", message: e instanceof ApiError ? e.message : messages.quoteRefreshFailed, hold, quote, canRetryPay: true });
      return;
    }

    savePersisted(key, { walletAttachmentId });
    setPhase({ kind: "paying", hold, quote: fresh });
    let submittedHash: string | undefined;
    try {
      const transfer = resolveBookingCheckoutTransferInput(fresh.payment);
      await executeUsdcTransfer({
        transfer,
        wallet,
        onSubmitted: (hash) => {
          // Persist the hash THE INSTANT it is submitted, before the receipt wait — a crash here resumes
          // confirmation, never re-pays.
          submittedHash = hash;
          savePersisted(key, { txHash: hash });
          void api.bookings.reportBookingPaymentSubmitted(hold.hold_id, {
            tx_ref: hash,
            wallet_attachment_id: walletAttachmentId,
          }).catch((error) => {
            console.warn("[booking-checkout] durable payment report failed", {
              holdId: hold.hold_id,
              txRef: hash,
              error,
            });
          });
          setPhase({ kind: "confirming", txHash: hash });
        },
      });
      await runConfirm(hold.hold_id, submittedHash as string, walletAttachmentId);
    } catch (e) {
      if (!submittedHash) {
        // Rejected/failed BEFORE submission — nothing on-chain, safe to let the user pay again.
        setPhase({ kind: "failed", message: e instanceof Error ? e.message : messages.paymentNotSubmitted, hold, quote: fresh, canRetryPay: true });
        return;
      }
      // Submitted but the receipt errored/reverted — the API is authoritative on the outcome. Resume
      // confirmation with the submitted hash (it will classify reverted/mismatched payments).
      await runConfirm(hold.hold_id, submittedHash, walletAttachmentId);
    }
  }, [api, connectedWallets, session, key, messages, runConfirm]);

  // Logged out: prompt sign-in instead of firing authenticated hold/quote (which would 401 into
  // "Authentication failed"). After sign-in, session.accessToken appears → the mount effect proceeds.
  if (!isAuthed) {
    return (
      <StandardRoutePage size="rail">
        <div className="mx-auto max-w-2xl space-y-6 p-6">
          <Type as="h1" variant="h2">{messages.title}</Type>
          <div className="space-y-4">
            <Type variant="body">{messages.signInToBookThisSession}</Type>
            <div className="flex gap-2">
              <Button onClick={() => requestAuth(messages.signInToBookSession)}>{messages.signIn}</Button>
              <Button variant="outline" onClick={backToAvailability}>{messages.backToAvailability}</Button>
            </div>
          </div>
        </div>
      </StandardRoutePage>
    );
  }

  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Type as="h1" variant="h2">{messages.title}</Type>

        {phase.kind === "holding" && (
          <Type variant="body" className="text-muted-foreground">{messages.reserving}</Type>
        )}

        {phase.kind === "confirming" && (
          <div className="space-y-2">
            <Type variant="body" className="text-muted-foreground">{messages.confirmingPayment}</Type>
            <Type variant="caption" className="text-muted-foreground font-mono break-all">{phase.txHash}</Type>
          </div>
        )}

        {phase.kind === "expired" && (
          <div className="space-y-4">
            <Type variant="body">{messages.holdExpired}</Type>
            <Button variant="outline" onClick={backToAvailability}>{messages.pickAnotherTime}</Button>
          </div>
        )}

        {phase.kind === "refund_pending" && (
          <div className="space-y-4">
            <Type variant="body">{messages.refundPending}</Type>
            {phase.txHash && (
              <Type variant="caption" className="text-muted-foreground font-mono break-all">{phase.txHash}</Type>
            )}
            <Button variant="outline" onClick={() => navigate("/bookings")}>{messages.viewMyBookings}</Button>
          </div>
        )}

        {phase.kind === "failed" && (
          <div className="space-y-4">
            <Type variant="body" className="text-destructive">{phase.message}</Type>
            <div className="flex gap-2">
              {phase.canRetryConfirm && phase.txHash && phase.walletAttachmentId && (
                <Button onClick={() => void runConfirm(loadPersisted(key)?.holdId ?? "", phase.txHash!, phase.walletAttachmentId!)}>
                  {messages.retryConfirmation}
                </Button>
              )}
              {phase.canRetryPay && phase.hold && phase.quote && (
                <Button onClick={() => void handlePay(phase.hold!, phase.quote!)}>{messages.tryPaymentAgain}</Button>
              )}
              <Button variant="outline" onClick={backToAvailability}>{messages.backToAvailability}</Button>
            </div>
          </div>
        )}

        {phase.kind === "wallet_required" && (
          <div className="space-y-4">
            <Type variant="body" className="text-destructive">{phase.message}</Type>
            <div className="flex gap-2">
              <Button onClick={() => void handlePay(phase.hold, phase.quote)}>{messages.retry}</Button>
              <Button variant="outline" onClick={() => navigate("/settings/wallet")}>{messages.walletSettings}</Button>
            </div>
          </div>
        )}

        {(phase.kind === "quoted" || phase.kind === "paying") && (() => {
          const { hold, quote } = phase;
          const isPaying = phase.kind === "paying";
          return (
            <div className="space-y-6">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex justify-between"><Type variant="label">{messages.session}</Type><Type variant="body">{formatSlotTime(hold.slot_start_utc, tz)}</Type></div>
                <div className="flex justify-between"><Type variant="label">{messages.duration}</Type><Type variant="body">{formatDuration(hold.slot_start_utc, hold.slot_end_utc)}</Type></div>
                <div className="flex justify-between"><Type variant="label">{messages.total}</Type><Type variant="body">{formatPrice(quote.gross_cents)}</Type></div>
                <div className="flex justify-between text-muted-foreground"><Type variant="caption">{interpolateMessage(messages.platformFee, { percent: String(Math.round(quote.platform_fee_bps / 100)) })}</Type><Type variant="caption">{formatPrice(quote.platform_fee_cents)}</Type></div>
                <div className="flex justify-between text-muted-foreground"><Type variant="caption">{messages.hostReceives}</Type><Type variant="caption">{formatPrice(quote.host_payout_cents)}</Type></div>
              </div>

              {!isPaying && (
                <div className="flex items-center gap-2">
                  <Type variant="caption" className="text-muted-foreground">{messages.holdReservedFor}</Type>
                  <Type variant="label" className={countdown < 60 ? "text-destructive" : undefined}>{formatCountdown(countdown)}</Type>
                </div>
              )}

              <div className="space-y-2 rounded-lg border border-border-soft bg-muted/30 p-4" aria-label={messages.bookingPolicies}>
                <Type variant="caption" className="text-muted-foreground">
                  {interpolateMessage(messages.viewerTimezone, { timezone: tz })}
                </Type>
                <Type variant="caption" className="text-muted-foreground">
                  {messages.cancellationPolicy}
                </Type>
                <Type variant="caption" className="text-muted-foreground">
                  {messages.paymentHeld}
                </Type>
              </div>

              <Button className="w-full" onClick={() => void handlePay(hold, quote)} loading={isPaying} disabled={isPaying || countdown === 0}>
                {isPaying
                  ? messages.submittingPayment
                  : interpolateMessage(messages.payWithUsdc, { amount: formatPrice(quote.gross_cents) })}
              </Button>
              <Button variant="ghost" className="w-full" disabled={isPaying} onClick={backToAvailability}>{messages.cancel}</Button>
            </div>
          );
        })()}

        {phase.kind === "confirmed" && (
          <div className="space-y-4">
            <Type variant="body">{messages.bookingConfirmed}</Type>
            <Type variant="caption" className="text-muted-foreground font-mono">{phase.bookingId}</Type>
            <Button variant="outline" onClick={() => navigate("/bookings")}>{messages.viewMyBookings}</Button>
          </div>
        )}
      </div>
    </StandardRoutePage>
  );
}
