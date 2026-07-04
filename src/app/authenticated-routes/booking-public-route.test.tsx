import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

let fakeApi: { bookings: { listBookingSlots: ReturnType<typeof mock> } };
let fakeSession: unknown = null;
const connect = mock(() => {});
const navigate = mock((_path: string) => {});

mock.module("@/lib/api", () => ({ useApi: () => fakeApi }));
mock.module("@/lib/api/session-store", () => ({ useSession: () => fakeSession }));
mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({ connect, loadError: null }),
  usePiratePrivyWallets: () => ({ connectedWallets: [] }),
}));
mock.module("@/lib/auth-origin", () => ({ isCanonicalAuthOrigin: () => true, buildCanonicalAuthUrl: () => "https://pirate.sc/" }));
mock.module("@/components/primitives/sonner", () => ({ toast: { error: () => {} } }));
mock.module("@/app/router", () => ({ navigate }));
const PageShellStub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
mock.module("@/components/compositions/app/page-shell", () => ({
  StandardRoutePage: PageShellStub,
  StandaloneMobilePage: PageShellStub,
  ChatRoutePage: PageShellStub,
  PublicRoutePage: PageShellStub,
  FullBleedMobileListSection: PageShellStub,
}));

const { BookingPublicPage } = await import("./booking-public-route");

function slotsResponse() {
  return {
    host_timezone: "UTC",
    viewer_timezone: "UTC",
    slots: [{ startUtc: "2099-01-05T10:00:00.000Z", endUtc: "2099-01-05T10:30:00.000Z", priceCents: 5000, available: true }],
  };
}

beforeEach(() => {
  fakeSession = null;
  connect.mockClear();
  navigate.mockClear();
  fakeApi = { bookings: { listBookingSlots: mock(async () => slotsResponse()) } };
});

afterEach(() => {
  cleanup();
});

describe("BookingPublicPage (logged out)", () => {
  // Tapping a slot while logged out must prompt sign-in (Privy connect), NOT route to checkout — that
  // route hits authenticated hold/quote APIs and dead-ends on "Authentication failed".
  test("a slot tap triggers sign-in and does not navigate to checkout", async () => {
    const { container } = render(<BookingPublicPage communityId={null} hostUserId="usr_host" />);
    const slot = await waitFor(() => {
      const btn = [...container.querySelectorAll("button")].find((b) => /USDC/u.test(b.textContent ?? ""));
      if (!btn) throw new Error("slot button not rendered yet");
      return btn as HTMLButtonElement;
    });
    slot.click();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect((document.body.textContent ?? "").includes("Authentication failed")).toBe(false);
  });
});
