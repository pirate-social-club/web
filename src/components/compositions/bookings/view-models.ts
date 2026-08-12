// Web-owned booking view-model types — the production boundary the booking compositions render against.
// These mirror the shapes the components need but are NOT imported from @pirate/bookings-domain, which
// is retained only for fixtures'/stories' tested demo logic until we decide where that logic belongs.
// Route-level adapters map the merged API DTOs (src/lib/api/bookings-types) onto these view models, so
// the backend stays authoritative for slot generation, pricing, and lifecycle.

export type IanaTz = string; // e.g. "Europe/Vienna"
export type IsoInstant = string; // RFC3339 UTC, e.g. "2026-06-22T14:00:00Z"
type Cents = number;
type Bps = number;

export type BookingState =
  | "hold"
  | "quoted"
  | "pending_payment"
  | "confirmed"
  | "live"
  | "completed"
  | "settled"
  | "expired_hold"
  | "cancelled_before_payment"
  | "cancelled_by_host"
  | "cancelled_by_booker"
  | "no_show_host"
  | "no_show_booker"
  | "refunded"
  | "disputed";

export interface ResolvedSlot {
  startUtc: IsoInstant;
  endUtc: IsoInstant;
  priceCents: Cents;
  available: boolean;
}

interface BookingAllocation {
  legs: Array<{
    recipientType: "host" | "platform_fee";
    shareBps: Bps;
    amountCents: Cents;
    settlementStrategy: "operator_payout" | "platform_fee_payout";
  }>;
}

export interface BookingQuotePreview {
  slot: ResolvedSlot;
  grossCents: Cents;
  platformFeeCents: Cents;
  hostPayoutCents: Cents;
  allocation: BookingAllocation;
  expiresAtUtc: IsoInstant;
}
