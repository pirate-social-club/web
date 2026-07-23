import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import type { BookingHold, BookingQuote } from "@/lib/api/bookings-types";

installDomGlobals();

let fakeApi: {
  bookings: {
    createBookingHold: ReturnType<typeof mock>;
    quoteBookingHold: ReturnType<typeof mock>;
    confirmBookingHold: ReturnType<typeof mock>;
  };
};
// Controllable per-test: an authed session (default) or null (logged out).
let fakeSession: unknown = null;

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/lib/api/session-store", () => ({ useSession: () => fakeSession }));
mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyWallets: () => ({ connectedWallets: [] }),
  usePiratePrivyRuntime: () => ({ connect: () => {}, loadError: null }),
}));
mock.module("@/lib/auth-origin", () => ({
  isCanonicalAuthOrigin: () => true,
  buildCanonicalAuthUrl: () => "https://pirate.sc/",
}));
mock.module("@/components/primitives/sonner", () => ({ toast: { error: () => {} } }));
mock.module("@/app/router", () => ({ navigate: () => {} }));
mock.module("@/components/compositions/app/page-shell", () => ({
  StandardRoutePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
// Pay-time only; stub so importing the route never pulls the on-chain transfer stack into the test.
mock.module("@/lib/commerce/routed-checkout", () => ({
  executeUsdcTransfer: async () => ({}),
  findConnectedFundingWallet: () => null,
  resolveBookingCheckoutTransferInput: () => ({}),
}));

const { BookingCheckoutPage } = await import("./booking-checkout-route");

const SOON = () => new Date(Date.now() + 15 * 60_000).toISOString();

function hold(): BookingHold {
  return {
    hold_id: "hold_1",
    source_community_id: null,
    host_user_id: "usr_host",
    booker_user_id: "usr_booker",
    slot_start_utc: "2099-01-05T10:00:00.000Z",
    slot_end_utc: "2099-01-05T10:30:00.000Z",
    price_cents: 5000,
    status: "active",
    expires_at_utc: SOON(),
  };
}

function quote(): BookingQuote {
  return {
    hold_id: "hold_1",
    gross_cents: 5000,
    platform_fee_bps: 1000,
    platform_fee_cents: 500,
    host_payout_cents: 4500,
    expires_at_utc: SOON(),
    payment: {
      payment_intent_id: "bpi_1",
      version: 1,
      chain_id: 84532,
      token_address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
      token_decimals: 6,
      token_symbol: "USDC",
      recipient_address: "0xbba024600cba5f375afdcec401f7dccb3d515829",
      amount_atomic: "50000000",
      gross_cents: 5000,
      quote_expires_at: SOON(),
      hold_expires_at: SOON(),
      wallet_attachment_required: true,
    },
  };
}

beforeEach(() => {
  // The route reads the slot from window.location.search; the linkedom test window has no history API,
  // so define the query directly.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { search: "?start=2099-01-05T10:00:00.000Z&end=2099-01-05T10:30:00.000Z" },
  });
  fakeSession = { accessToken: "tok", user: { primary_wallet_attachment: "wa_1" }, profile: { primary_wallet_address: "0x1" } };
  fakeApi = {
    bookings: {
      createBookingHold: mock(async () => ({ hold: hold() })),
      quoteBookingHold: mock(async () => ({ quote: quote() })),
      confirmBookingHold: mock(async () => ({ booking: { booking_id: "bkg_1" }, already_confirmed: false })),
    },
  };
});

afterEach(() => {
  cleanup();
});

describe("BookingCheckoutPage", () => {
  // Regression for the first-render expiry race: a freshly quoted hold with a FUTURE expiry must land on
  // the payable summary, never flip straight to "expired" because the countdown momentarily read 0.
  test("renders the payable summary for a fresh quote with a future expiry", async () => {
    render(<BookingCheckoutPage communityId={null} hostUserId="usr_host" />);
    await waitFor(() => {
      expect(document.body.textContent).toContain("Total");
    });
    expect(document.body.textContent).toContain("50.00 USDC");
    expect((document.body.textContent ?? "").includes("expired")).toBe(false);
  });

  test("sends community attribution only when creating the hold", async () => {
    render(<BookingCheckoutPage communityId="com_feed" hostUserId="usr_host" />);
    await waitFor(() => {
      expect(fakeApi.bookings.createBookingHold).toHaveBeenCalledWith("usr_host", {
        slot_end_utc: "2099-01-05T10:30:00.000Z",
        slot_start_utc: "2099-01-05T10:00:00.000Z",
        source_community_id: "com_feed",
      });
    });
    expect(fakeApi.bookings.quoteBookingHold).toHaveBeenCalledWith("hold_1");
    expect(fakeApi.bookings.confirmBookingHold).not.toHaveBeenCalled();
  });

  // Logged out: must show a sign-in prompt and NEVER hit the authenticated hold API (which would 401
  // into "Authentication failed").
  test("prompts sign-in and creates no hold when logged out", async () => {
    fakeSession = null;
    render(<BookingCheckoutPage communityId={null} hostUserId="usr_host" />);
    await waitFor(() => {
      expect(document.body.textContent).toContain("Sign in to book this session.");
    });
    expect((document.body.textContent ?? "").includes("Authentication failed")).toBe(false);
    expect(fakeApi.bookings.createBookingHold).not.toHaveBeenCalled();
  });
});
