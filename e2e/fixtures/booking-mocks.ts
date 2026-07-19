import type { Page, Route } from "@playwright/test";

import { mockProfile, mockWalletAddress } from "./auth-session";

// Layered, paid-bookings-specific API mocks. Install AFTER installAuthenticatedApiMocks so these
// booking routes take precedence (Playwright matches most-recently-registered first); anything not
// matched here falls through to the base authenticated mock via route.fallback().
//
// Everything is Base SEPOLIA / testnet — mirrors the current prod-testnet posture, so the checkout
// screen must never surface mainnet chain/token/amount.

const BOOKING_TESTNET = {
  chainId: 84532,
  // Base Sepolia USDC + the settlement operator wallet (pay-in recipient), lowercased as served.
  tokenAddress: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  recipientAddress: "0xbba024600cba5f375afdcec401f7dccb3d515829",
} as const;

interface CapturedRequest {
  method: string;
  path: string;
  body: unknown;
}

export interface PaidBookingMockState {
  // The signed-in host (own profile / settings). Matches the mock session user.
  hostUserId: string;
  // Whether the viewed host exposes booking (drives the public/own Calendar tab + slot rendering).
  isBookable: boolean;
  isPublished: boolean;
  basePriceCents: number;
  slotDurationSeconds: number;
  hostTimezone: string;
  // Recorded mutating calls, for assertions.
  captured: CapturedRequest[];
  managementBookingCancelled: boolean;
}

export function createPaidBookingMockState(overrides: Partial<PaidBookingMockState> = {}): PaidBookingMockState {
  return {
    hostUserId: mockProfile.id,
    isBookable: true,
    isPublished: true,
    basePriceCents: 5000,
    slotDurationSeconds: 1800,
    hostTimezone: "UTC",
    captured: [],
    managementBookingCancelled: false,
    ...overrides,
  };
}

function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

// A near-future ISO timestamp. The checkout countdown drives a setTimeout off the quote expiry, so a
// far-future value (e.g. year 2099) overflows the 32-bit ms limit and fires immediately → the screen
// wrongly flips to "expired". Keep the reservation window realistic.
function soonIso(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60_000).toISOString();
}

function bookingProfile(state: PaidBookingMockState) {
  return {
    object: "booking_profile" as const,
    host: state.hostUserId,
    display_headline: "E2E tutoring",
    bio: "Booking smoke host.",
    topics: ["math"],
    intro_video_ref: null,
    host_timezone: state.hostTimezone,
    base_price_cents: state.basePriceCents,
    default_slot_duration_seconds: state.slotDurationSeconds,
    platform_fee_bps: 1000,
    payout_wallet_address: mockWalletAddress,
    is_published: state.isPublished,
    created: Date.parse("2026-06-01T00:00:00.000Z"),
    updated: Date.parse("2026-06-01T00:00:00.000Z"),
  };
}

function availabilityRule() {
  return {
    object: "availability_rule" as const,
    id: "bar_e2e",
    by_weekday: [1, 2, 3, 4, 5],
    start_local: "09:00",
    end_local: "17:00",
    slot_duration_seconds: 1800,
    effective_from: null,
    effective_until: null,
    created: Date.parse("2026-06-01T00:00:00.000Z"),
    updated: Date.parse("2026-06-01T00:00:00.000Z"),
  };
}

// A single, always-in-the-future bookable slot so the public calendar renders a clickable chip.
function futureSlot(state: PaidBookingMockState) {
  const startUtc = "2099-01-05T10:00:00.000Z";
  const endUtc = "2099-01-05T10:30:00.000Z";
  return { startUtc, endUtc, priceCents: state.basePriceCents, available: true };
}

function bookingQuote(holdId: string, state: PaidBookingMockState) {
  const gross = state.basePriceCents;
  const feeCents = Math.floor((gross * 1000 + 5000) / 10000);
  return {
    hold_id: holdId,
    gross_cents: gross,
    platform_fee_bps: 1000,
    platform_fee_cents: feeCents,
    host_payout_cents: gross - feeCents,
    expires_at_utc: soonIso(15),
    payment: {
      payment_intent_id: `bpi_${holdId}`,
      version: 1,
      chain_id: BOOKING_TESTNET.chainId,
      token_address: BOOKING_TESTNET.tokenAddress,
      token_decimals: 6,
      token_symbol: "USDC",
      recipient_address: BOOKING_TESTNET.recipientAddress,
      // gross_cents (2dp) -> 6dp atomic
      amount_atomic: String(BigInt(gross) * 10_000n),
      gross_cents: gross,
      quote_expires_at: soonIso(15),
      hold_expires_at: soonIso(15),
      wallet_attachment_required: true,
    },
  };
}

function managementBooking(state: PaidBookingMockState) {
  return {
    object: "booking", booking_id: "booking_management_e2e", source_community_id: null,
    host_user_id: "usr_tutor_e2e", booker_user_id: mockProfile.id,
    slot_start_utc: "2099-01-05T10:00:00.000Z", slot_end_utc: "2099-01-05T10:30:00.000Z",
    gross_cents: state.basePriceCents, platform_fee_cents: 500, host_payout_cents: state.basePriceCents - 500,
    refund_cents: null, status: "confirmed", outcome: null, settlement_status: "pending",
    counterparty: { user_id: "usr_tutor_e2e", public_handle: "tutor.pirate", display_name: "Tutor", avatar_ref: null },
    funding_tx_ref: "0xmock", payout_tx_ref: null, refund_tx_ref: null, live_room_id: null,
    confirmed_at: "2026-07-10T00:00:00.000Z", completed_at: null, settled_at: null, cancelled_at: null,
    created_at: "2026-07-10T00:00:00.000Z", updated_at: "2026-07-10T00:00:00.000Z", viewer_role: "booker",
  };
}

async function record(state: PaidBookingMockState, route: Route): Promise<void> {
  const req = route.request();
  let body: unknown = null;
  try { body = req.postDataJSON(); } catch { body = req.postData(); }
  state.captured.push({ method: req.method(), path: new URL(req.url()).pathname, body });
}

export async function installPaidBookingApiMocks(page: Page, state: PaidBookingMockState): Promise<void> {
  // Host settings: GET profile / POST upsert / publish toggle.
  await page.route(/\/host-bookings\/me\/profile(\/(publish|unpublish))?(\?.*)?$/u, async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill(json(bookingProfile(state)));
    await record(state, route);
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/publish")) { state.isPublished = true; state.isBookable = true; }
    else if (url.pathname.endsWith("/unpublish")) { state.isPublished = false; state.isBookable = false; }
    else {
      const patch = (() => { try { return route.request().postDataJSON() as Record<string, unknown>; } catch { return {}; } })();
      if (typeof patch.base_price_cents === "number") state.basePriceCents = patch.base_price_cents;
    }
    return route.fulfill(json(bookingProfile(state)));
  });

  await page.route(/\/host-bookings\/me\/availability-rules(\/[^/?]+)?(\?.*)?$/u, async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill(json({ object: "list", data: [availabilityRule()], has_more: false }));
    if (method === "DELETE") { await record(state, route); return route.fulfill(json({ id: "bar_e2e", object: "availability_rule", deleted: true })); }
    await record(state, route);
    return route.fulfill(json(availabilityRule(), 201));
  });

  await page.route(/\/host-bookings\/me\/(price-rules|availability-exceptions)(\/[^/?]+)?(\?.*)?$/u, async (route) => {
    if (route.request().method() !== "GET") await record(state, route);
    return route.fulfill(json({ object: "list", data: [], has_more: false }));
  });

  // Public discovery + checkout.
  await page.route(/\/bookings\/hosts\/[^/]+\/slots(\?.*)?$/u, (route) =>
    route.fulfill(json({ host_timezone: state.hostTimezone, viewer_timezone: state.hostTimezone, slots: state.isBookable ? [futureSlot(state)] : [] })));

  await page.route(/\/bookings\/hosts\/[^/]+\/holds(\?.*)?$/u, async (route) => {
    await record(state, route);
    const slot = futureSlot(state);
    return route.fulfill(json({
      hold: {
        hold_id: "hold_e2e",
        source_community_id: null,
        host_user_id: state.hostUserId,
        booker_user_id: mockProfile.id,
        slot_start_utc: slot.startUtc,
        slot_end_utc: slot.endUtc,
        price_cents: state.basePriceCents,
        status: "active",
        expires_at_utc: soonIso(15),
      },
    }, 201));
  });

  await page.route(/\/bookings\/holds\/[^/]+\/quote(\?.*)?$/u, async (route) => {
    await record(state, route);
    return route.fulfill(json({ quote: bookingQuote("hold_e2e", state) }));
  });

  // Safety net: never let a real confirm (money move) escape the mock during a smoke. Record it FIRST so
  // the "without charging" assertion (state.captured has no /confirm) can actually fail if the app ever
  // hits confirm — otherwise the check is dead.
  await page.route(/\/bookings\/holds\/[^/]+\/confirm(\?.*)?$/u, async (route) => {
    await record(state, route);
    return route.fulfill(json({ error: "confirm is disabled in mocked smoke" }, 409));
  });

  await page.route(/\/bookings\/booking_management_e2e\/cancellation-preview(\?.*)?$/u, (route) =>
    route.fulfill(json({
      object: "booking_cancellation_preview", booking_id: "booking_management_e2e", cancelled_by: "booker",
      gross_cents: state.basePriceCents, refund_cents: state.basePriceCents, host_payout_cents: 0,
      platform_fee_cents: 0, previewed_at: new Date().toISOString(), policy_cutoff_at: "2099-01-04T10:00:00.000Z",
    })));

  await page.route(/\/bookings\/booking_management_e2e\/cancel(\?.*)?$/u, async (route) => {
    await record(state, route);
    state.managementBookingCancelled = true;
    return route.fulfill(json({
      booking: { booking_id: "booking_management_e2e", status: "cancelled_by_booker", outcome: "cancelled_by_booker", refund_cents: state.basePriceCents, refund_tx_ref: null, payout_tx_ref: null },
      cancelled_by: "booker", already_cancelled: false,
    }));
  });

  await page.route(/\/bookings(\?.*)?$/u, (route) => {
    if (route.request().resourceType() === "document") return route.fallback();
    return route.fulfill(json({
      object: "list", data: state.managementBookingCancelled ? [] : [managementBooking(state)], has_more: false,
    }));
  });
}
