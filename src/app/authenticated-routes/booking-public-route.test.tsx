import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { UiLocaleProvider } from "@/lib/ui-locale";

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
mock.module("@/components/compositions/app/page-shell", () => ({
  StandardRoutePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  test("renders the public booking copy in Arabic", async () => {
    const { container } = render(
      <UiLocaleProvider dir="rtl" locale="ar">
        <BookingPublicPage communityId={null} hostUserId="usr_host" />
      </UiLocaleProvider>,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("حجز جلسة");
      expect(container.textContent).toContain("المواعيد المتاحة");
    });
  });

  // Tapping a slot while logged out must prompt sign-in (Privy connect), NOT route to checkout — that
  // route hits authenticated hold/quote APIs and dead-ends on "Authentication failed".
  test("a slot tap triggers sign-in and does not navigate to checkout", async () => {
    const { container } = render(<BookingPublicPage communityId={null} hostUserId="usr_host" />);
    const slot = await waitFor(() => {
      const btn = [...container.querySelectorAll("button")].find((b) => /\$50/u.test(b.textContent ?? ""));
      if (!btn) throw new Error("slot button not rendered yet");
      return btn as HTMLButtonElement;
    });
    slot.click();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect((document.body.textContent ?? "").includes("Authentication failed")).toBe(false);
  });

  test("signed-in checkout navigation carries only the authoritative slot bounds", async () => {
    fakeSession = { accessToken: "tok" };
    const { container } = render(<BookingPublicPage communityId={null} hostUserId="usr_host" />);
    const slot = await waitFor(() => {
      const btn = [...container.querySelectorAll("button")].find((b) => /\$50/u.test(b.textContent ?? ""));
      if (!btn) throw new Error("slot button not rendered yet");
      return btn as HTMLButtonElement;
    });
    fireEvent.click(slot);
    expect(navigate).toHaveBeenCalledTimes(1);
    const path = String(navigate.mock.calls[0]?.[0]);
    const url = new URL(path, "https://pirate.test");
    expect(url.searchParams.get("start")).toBe("2099-01-05T10:00:00.000Z");
    expect(url.searchParams.get("end")).toBe("2099-01-05T10:30:00.000Z");
    expect(url.searchParams.has("price")).toBe(false);
  });
});
