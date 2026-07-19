import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

let sessionValue: { profile?: { id: string } | null } | null = null;
let bookingHookCalls = 0;

mock.module("@/lib/api/session-store", () => ({
  useSession: () => sessionValue,
}));

mock.module("@/hooks/use-route-messages", () => ({
  useRouteMessages: () => ({
    copy: {
      routeStatus: {
        settings: {
          auth: "Sign in to manage settings.",
        },
      },
    },
  }),
}));

mock.module("@/hooks/use-client-hydrated", () => ({
  useClientHydrated: () => true,
}));

mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({
    busy: false,
    configured: true,
    connect: () => {},
    loadError: null,
    loaded: true,
  }),
}));

mock.module("@/app/authenticated-state/use-booking-host-settings", () => ({
  useBookingHostSettings: () => {
    bookingHookCalls += 1;
    return {
      loading: true,
      sectionProps: {},
    };
  },
}));

const { BookingHostSettingsPage } = await import("./booking-host-settings-route");

afterEach(() => {
  cleanup();
  sessionValue = null;
  bookingHookCalls = 0;
});

describe("BookingHostSettingsPage", () => {
  test("requires auth before loading host booking settings", () => {
    const { getAllByText, getByText, queryByText } = render(<BookingHostSettingsPage />);

    expect(getAllByText("Sign in").length).toBeGreaterThan(0);
    expect(getByText("Sign in to manage settings.")).toBeTruthy();
    expect(queryByText("Loading booking settings…")).toBeNull();
    expect(bookingHookCalls).toBe(0);
  });

  test("loads booking settings for an authenticated profile", () => {
    sessionValue = { profile: { id: "usr_route" } };

    const { getByText, queryByText } = render(<BookingHostSettingsPage />);

    expect(getByText("Loading booking settings…")).toBeTruthy();
    expect(queryByText("Sign in to manage settings.")).toBeNull();
    expect(bookingHookCalls).toBe(1);
  });
});
