import * as React from "react";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { createTestDom, installDomGlobals } from "@/test/setup-dom";

installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
  }),
});

import { ProfileBookPanel, type ProfileBookPanelProps } from "./profile-book-panel";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";

function text(props: ProfileBookPanelProps): string {
  const html = renderToStaticMarkup(<ProfileBookPanel {...props} />);
  return (createTestDom(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body.textContent ?? "");
}

const SLOTS: ResolvedSlot[] = [
  { startUtc: "2026-09-21T09:00:00.000Z" as ResolvedSlot["startUtc"], endUtc: "2026-09-21T09:30:00.000Z" as ResolvedSlot["endUtc"], priceCents: 5000 as ResolvedSlot["priceCents"], available: true },
];

describe("ProfileBookPanel", () => {
  test("owner published → Manage bookings + live note", () => {
    const t = text({ mode: "owner", published: true, onManage: () => {} });
    expect(t).toContain("Manage bookings");
    expect(t).toContain("Your bookings are live");
    expect(t).not.toContain("Set up bookings");
  });

  test("owner not published → Set up bookings + setup note", () => {
    const t = text({ mode: "owner", published: false, onManage: () => {} });
    expect(t).toContain("Set up bookings");
    expect(t).not.toContain("Manage bookings");
  });

  test("viewer with slots → price + availability rendered", () => {
    const t = text({ mode: "viewer", basePriceCents: 5000, slots: SLOTS, viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} });
    expect(t).toContain("50.00 USDC per session");
    expect(t).not.toContain("No available times");
  });

  test("viewer with no slots → empty-state copy", () => {
    const t = text({ mode: "viewer", basePriceCents: 5000, slots: [], viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} });
    expect(t).toContain("No available times right now");
  });
});
