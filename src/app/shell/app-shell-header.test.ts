import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";

import { resolveMobileHeaderTitle } from "./app-shell-header";
import { getLocaleMessages } from "@/locales";

const copy = getLocaleMessages("en", "shell");
const homeRoute = { kind: "home", path: "/" } as Parameters<typeof resolveMobileHeaderTitle>[0]["route"];

describe("resolveMobileHeaderTitle", () => {
  test("drops the centre title on the mobile video overlay", () => {
    expect(resolveMobileHeaderTitle({ copy, mediaOverlay: true, route: homeRoute, session: null })).toBeNull();
  });

  test("keeps the title when the overlay is not active", () => {
    expect(resolveMobileHeaderTitle({ copy, route: homeRoute, session: null })).toBe("Pirate");
  });

  test("keeps titles on other routes", () => {
    const inbox = { kind: "inbox", path: "/inbox" } as typeof homeRoute;
    expect(resolveMobileHeaderTitle({ copy, route: inbox, session: null })).toBe(copy.mobileFooter.inboxLabel);
  });
});
