import { describe, expect, test } from "bun:test";

import type { AppRoute } from "@/app/router";

import { routeOwnsContentSpacing } from "./app-shell-route-spacing";

const BOOKING_ROUTE_KINDS = [
  "booking-host-settings",
  "booking-public",
  "booking-checkout",
  "booking-management",
  "booking-session",
] as const satisfies readonly AppRoute["kind"][];

describe("app shell route spacing", () => {
  test("leaves spacing to every booking route", () => {
    for (const kind of BOOKING_ROUTE_KINDS) {
      expect(routeOwnsContentSpacing({ kind })).toBe(true);
    }
  });

  test("keeps legacy shell spacing for routes that have not migrated", () => {
    expect(routeOwnsContentSpacing({ kind: "settings" })).toBe(false);
  });
});
