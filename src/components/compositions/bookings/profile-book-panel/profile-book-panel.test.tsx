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

function html(props: ProfileBookPanelProps): string {
  return renderToStaticMarkup(<ProfileBookPanel {...props} />);
}

const SLOTS: ResolvedSlot[] = [
  { startUtc: "2026-09-21T09:00:00.000Z" as ResolvedSlot["startUtc"], endUtc: "2026-09-21T09:30:00.000Z" as ResolvedSlot["endUtc"], priceCents: 5000 as ResolvedSlot["priceCents"], available: true },
];

describe("ProfileBookPanel", () => {
  test("owner configured → availability heading + Edit schedule (not the setup prompt)", () => {
    const t = text({ mode: "owner", configured: true, basePriceCents: 5000, slots: SLOTS, viewerTimezone: "Europe/Vienna" as never, onEdit: () => {} });
    expect(t).toContain("Your availability");
    expect(t).toContain("Edit schedule");
    expect(t).not.toContain("Set up your schedule");
  });

  test("owner not configured → setup prompt + Set up bookings", () => {
    const t = text({ mode: "owner", configured: false, basePriceCents: 0, slots: [], viewerTimezone: "Europe/Vienna" as never, onEdit: () => {} });
    expect(t).toContain("Set up bookings");
    expect(t).not.toContain("Your availability");
  });

  test("viewer with slots → shared duration/price/timezone stated once in the header", () => {
    const t = text({ mode: "viewer", startingPriceCents: 5000, slots: SLOTS, viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} });
    expect(t).toContain("30 min · $50 · Times in Vienna");
    expect(t).not.toContain("USDC per session");
    expect(t).not.toContain("$50+");
    expect(t).not.toContain("No available times");
  });

  test("viewer renders no checkout link until a slot is chosen", () => {
    const markup = html({
      mode: "viewer",
      startingPriceCents: 5000,
      slots: SLOTS,
      viewerTimezone: "Europe/Vienna" as never,
      getSlotHref: () => "/book/usr_host/checkout?start=2026-09-21T09%3A00%3A00.000Z",
      onSelectSlot: () => {},
    });

    // Selection is an intermediate step now; the checkout href appears on the confirm
    // footer's Continue only after a chip tap (covered in availability-calendar.test.tsx).
    expect(markup).not.toContain("/book/usr_host/checkout");
  });

  test("viewer with no slots → empty-state copy", () => {
    const t = text({ mode: "viewer", startingPriceCents: 5000, slots: [], viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} });
    expect(t).toContain("No available times right now");
  });

  // Prevents the flash: while availability is loading, show a loading hint, never the empty state.
  test("viewer loading → loading hint, not empty state", () => {
    const t = text({ mode: "viewer", loading: true, startingPriceCents: 5000, slots: [], viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} });
    expect(t).toContain("Loading availability…");
    expect(t).not.toContain("No available times");
  });

  test("owner configured + loading → loading hint, not empty state", () => {
    const t = text({ mode: "owner", configured: true, loading: true, basePriceCents: 5000, slots: [], viewerTimezone: "Europe/Vienna" as never, onEdit: () => {} });
    expect(t).toContain("Loading availability…");
    expect(t).not.toContain("No available times");
  });
});
