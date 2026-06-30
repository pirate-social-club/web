import * as React from "react";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { createTestDom, installDomGlobals } from "@/test/setup-dom";

// Radix primitives (Checkbox) don't client-render under linkedom, so we assert on the real
// server-rendered DOM instead of a testing-library client render. Behavior that needs the
// container hook (save/add/remove/publish) is covered in use-booking-host-settings.test.tsx.
installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
  }),
});

import { ProfileBookingsSection } from "./profile-bookings-section";
import type { ProfileBookingsSectionProps, ProfileBookingsValues } from "./profile-bookings-section";

const BASE_VALUES: ProfileBookingsValues = {
  timezone: "Europe/Vienna",
  durationSeconds: 1800,
  priceUsd: "50.00",
  payoutWallet: "",
  headline: "",
};

function renderToDoc(overrides: Partial<ProfileBookingsSectionProps> = {}): Document {
  const props: ProfileBookingsSectionProps = {
    values: BASE_VALUES,
    onValuesChange: () => {},
    rules: [],
    priceRules: [],
    exceptions: [],
    isPublished: false,
    timezoneOptions: ["UTC", "Europe/Vienna"],
    ...overrides,
  };
  const html = renderToStaticMarkup(<ProfileBookingsSection {...props} />);
  return createTestDom(`<!DOCTYPE html><html><body>${html}</body></html>`).document as unknown as Document;
}

function publishButton(doc: Document): HTMLButtonElement | undefined {
  return Array.from(doc.querySelectorAll("button")).find((b) =>
    /publish bookings/i.test(b.textContent ?? ""),
  ) as HTMLButtonElement | undefined;
}

describe("ProfileBookingsSection", () => {
  test("publish is blocked when there is no payout wallet and not yet published", () => {
    const doc = renderToDoc({ values: { ...BASE_VALUES, payoutWallet: "" }, isPublished: false });
    const button = publishButton(doc);
    expect(button).toBeDefined();
    expect(button!.hasAttribute("disabled")).toBe(true);
    expect(doc.body.textContent).toContain("Add a payout wallet and save before publishing.");
  });

  test("publish is enabled once a payout wallet is present", () => {
    const doc = renderToDoc({ values: { ...BASE_VALUES, payoutWallet: "0xbBA0240" }, isPublished: false });
    expect(publishButton(doc)!.hasAttribute("disabled")).toBe(false);
  });

  test("renders existing weekly availability rules", () => {
    const doc = renderToDoc({
      values: { ...BASE_VALUES, payoutWallet: "0xbBA0240" },
      rules: [{ object: "availability_rule", id: "bar_1", by_weekday: [1, 2, 3, 4, 5], start_local: "09:00", end_local: "17:00", slot_duration_seconds: 1800, effective_from: null, effective_until: null, created: 0, updated: 0 }],
    });
    expect(doc.body.textContent).toContain("09:00–17:00");
  });

  test("shows the live publish copy when already published", () => {
    const doc = renderToDoc({ values: { ...BASE_VALUES, payoutWallet: "0xbBA0240" }, isPublished: true });
    expect(doc.body.textContent).toContain("Your bookings are live");
    expect(publishButton(doc)).toBeUndefined(); // button reads "Unpublish" when live
  });
});
