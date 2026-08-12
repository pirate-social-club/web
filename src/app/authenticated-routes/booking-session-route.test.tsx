import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import type { AttachSessionResponse, BookingView } from "@/lib/api/bookings-types";

installDomGlobals();

let fakeApi: {
  bookings: {
    attachBookingSession: ReturnType<typeof mock>;
    getBooking: ReturnType<typeof mock>;
    heartbeatBookingSession: ReturnType<typeof mock>;
    startBookingSession: ReturnType<typeof mock>;
  };
};
const renderedStages: AttachSessionResponse["agora"][] = [];
const navigations: string[] = [];

mock.module("@/lib/api", () => ({
  useApi: () => fakeApi,
}));

mock.module("@/app/router", () => ({
  navigate: (path: string) => {
    navigations.push(path);
  },
}));

const { BookingSessionPage } = await import("./booking-session-route");

function FakeVideoStage({ agora }: { agora: AttachSessionResponse["agora"] }): React.ReactElement {
  renderedStages.push(agora);
  return <div data-testid="booking-video-stage">{agora.channel}</div>;
}

function booking(overrides: Partial<BookingView> = {}): BookingView {
  const start = new Date(Date.now() - 60_000);
  const end = new Date(Date.now() + 30 * 60_000);
  return {
    booker_user_id: "usr_booker",
    booking_id: "bkg_route",
    cancelled_at: null,
    completed_at: null,
    confirmed_at: new Date().toISOString(),
    counterparty: {
      avatar_ref: null,
      display_name: "Booker Test",
      public_handle: "booker.pirate",
      user_id: "usr_booker",
    },
    created_at: new Date().toISOString(),
    funding_tx_ref: "0xfunding",
    gross_cents: 100,
    host_payout_cents: 90,
    host_user_id: "usr_host",
    live_room_id: null,
    object: "booking",
    payout_tx_ref: null,
    platform_fee_cents: 10,
    refund_cents: null,
    refund_tx_ref: null,
    outcome: null,
    settlement_status: "pending",
    settled_at: null,
    slot_end_utc: end.toISOString(),
    slot_start_utc: start.toISOString(),
    source_community_id: null,
    status: "confirmed",
    updated_at: new Date().toISOString(),
    viewer_role: "host",
    ...overrides,
  } as BookingView;
}

function attachSession(overrides: Partial<AttachSessionResponse> = {}): AttachSessionResponse {
  return {
    agora: {
      app_id: "agora-app",
      channel: "pirate-booking-bkg_route",
      configured: true,
      token: "agora-token",
      token_expires_at: Date.now() + 60 * 60_000,
      uid: 42,
    },
    channel: "pirate-booking-bkg_route",
    party: "host",
    session_id: "bks_route",
    ...overrides,
  };
}

describe("BookingSessionPage", () => {
  beforeEach(() => {
    renderedStages.length = 0;
    navigations.length = 0;
    fakeApi = {
      bookings: {
        attachBookingSession: mock(async () => attachSession()),
        getBooking: mock(async () => ({ booking: booking() })),
        heartbeatBookingSession: mock(async () => ({ ok: true })),
        startBookingSession: mock(async () => ({ already_live: false, booking: { booking_id: "bkg_route", status: "live" } })),
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  test("starts, attaches, renders Agora, and heartbeats for a host inside the join window", async () => {
    const view = render(<BookingSessionPage bookingId="bkg_route" VideoStage={FakeVideoStage} />);

    await view.findByTestId("booking-video-stage");

    expect(view.container.querySelector('[data-route-spacing-owner="standard"]')).toBeTruthy();

    expect(fakeApi.bookings.getBooking).toHaveBeenCalledWith("bkg_route");
    expect(fakeApi.bookings.startBookingSession).toHaveBeenCalledWith("bkg_route");
    expect(fakeApi.bookings.attachBookingSession).toHaveBeenCalledWith("bkg_route");
    expect(renderedStages).toEqual([
      expect.objectContaining({
        app_id: "agora-app",
        channel: "pirate-booking-bkg_route",
        configured: true,
        uid: 42,
      }),
    ]);

    await waitFor(() => {
      expect(fakeApi.bookings.heartbeatBookingSession).toHaveBeenCalledWith("bkg_route", { session_id: "bks_route" });
    });
    expect(navigations).toEqual([]);
  });

  test("does not start or attach outside the join window", async () => {
    const start = new Date(Date.now() + 10 * 60_000);
    const end = new Date(Date.now() + 40 * 60_000);
    fakeApi.bookings.getBooking = mock(async () => ({
      booking: booking({
        slot_end_utc: end.toISOString(),
        slot_start_utc: start.toISOString(),
      }),
    }));

    const view = render(<BookingSessionPage bookingId="bkg_route" VideoStage={FakeVideoStage} />);

    await view.findByText(/isn't available yet/i);
    expect(fakeApi.bookings.startBookingSession).not.toHaveBeenCalled();
    expect(fakeApi.bookings.attachBookingSession).not.toHaveBeenCalled();
    expect(fakeApi.bookings.heartbeatBookingSession).not.toHaveBeenCalled();
    expect(renderedStages).toEqual([]);
  });
});
