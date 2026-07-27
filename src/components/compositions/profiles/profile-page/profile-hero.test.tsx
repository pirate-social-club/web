import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { createTestDom, installDomGlobals } from "@/test/setup-dom";

// Server-render + DOM-parse (avoids linkedom client-render quirks). This proves the booking CTA
// is self-only: it renders in the "self" hero actions and never in the "public" branch.
installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
  }),
});

import { ProfileHero } from "./profile-hero";
import type { ProfileData } from "./profile-page.types";

function baseProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return { displayName: "Ada", handle: "@ada", viewerContext: "self", ...overrides };
}

function renderHero(profile: ProfileData, onBookingCta?: () => void, onCommunitiesCta?: () => void): Document {
  const html = renderToStaticMarkup(
    <ProfileHero profile={profile} onEditProfile={() => {}} onBookingCta={onBookingCta} onCommunitiesCta={onCommunitiesCta} />,
  );
  return createTestDom(`<!DOCTYPE html><html><body>${html}</body></html>`).document as unknown as Document;
}

function hasText(doc: Document, text: string): boolean {
  return (doc.body.textContent ?? "").includes(text);
}

describe("ProfileHero booking CTA", () => {
  test("self profile with a CTA label + handler shows the booking CTA", () => {
    const doc = renderHero(baseProfile({ viewerContext: "self", bookingCtaLabel: "Set up bookings" }), () => {});
    expect(hasText(doc, "Set up bookings")).toBe(true);
    expect(hasText(doc, "Edit profile")).toBe(true);
  });

  test("self profile without a CTA label shows no booking CTA", () => {
    const doc = renderHero(baseProfile({ viewerContext: "self" }), () => {});
    expect(hasText(doc, "Set up bookings")).toBe(false);
    expect(hasText(doc, "Manage bookings")).toBe(false);
  });

  test("public viewer never sees the booking CTA (even if a label is present)", () => {
    const doc = renderHero(baseProfile({ viewerContext: "public", bookingCtaLabel: "Manage bookings" }), () => {});
    expect(hasText(doc, "Manage bookings")).toBe(false);
    expect(hasText(doc, "Set up bookings")).toBe(false);
    expect(hasText(doc, "Edit profile")).toBe(false); // public branch shows follow/message, not owner actions
  });

  test("CTA is hidden when the handler is missing even on a self profile", () => {
    const doc = renderHero(baseProfile({ viewerContext: "self", bookingCtaLabel: "Manage bookings" }), undefined);
    expect(hasText(doc, "Manage bookings")).toBe(false);
  });
});

// /your-communities has no other entry point: the sidebar lists communities but
// never links the page, and the settings index that also links it is unreachable
// on desktop. This CTA is the one that has to survive.
describe("ProfileHero communities CTA", () => {
  test("self profile with a handler shows the communities CTA", () => {
    const doc = renderHero(baseProfile({ viewerContext: "self" }), undefined, () => {});
    expect(hasText(doc, "Your Communities")).toBe(true);
  });

  test("self profile without a handler shows no communities CTA", () => {
    const doc = renderHero(baseProfile({ viewerContext: "self" }), undefined, undefined);
    expect(hasText(doc, "Your Communities")).toBe(false);
  });

  test("public viewer never sees the communities CTA", () => {
    const doc = renderHero(baseProfile({ viewerContext: "public" }), undefined, () => {});
    expect(hasText(doc, "Your Communities")).toBe(false);
  });
});
