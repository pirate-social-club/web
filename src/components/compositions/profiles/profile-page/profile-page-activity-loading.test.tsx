import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { createTestDom, installDomGlobals } from "@/test/setup-dom";

installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null, // desktop → tabs render as text
    addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
  }),
});
Object.defineProperty(window, "location", {
  configurable: true,
  value: { hash: "", href: "https://pirate.sc/", search: "", pathname: "/" },
});

import { ProfilePage } from "./profile-page";
import type { ProfileData, ProfilePageProps } from "./profile-page.types";

function baseProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return { displayName: "Ada", handle: "@ada", viewerContext: "public", ...overrides };
}

function render(props: Partial<ProfilePageProps>): string {
  const full: ProfilePageProps = {
    profile: baseProfile(),
    rightRail: { stats: [] },
    ...props,
  };
  const html = renderToStaticMarkup(<ProfilePage {...full} />);
  return (createTestDom(`<!DOCTYPE html><html><body>${html}</body></html>`).document.body.textContent ?? "");
}

describe("ProfilePage activity loading state", () => {
  test("loaded empty tab shows the empty state", () => {
    const t = render({ defaultTab: "posts", posts: [] });
    expect(t).toContain("Nothing here yet.");
  });

  test("loading tab shows skeletons instead of the empty state", () => {
    const t = render({ activityLoading: true, defaultTab: "posts", posts: [] });
    expect(t).not.toContain("Nothing here yet.");
  });

  test("error wins over loading", () => {
    const t = render({ activityError: "Could not load profile activity.", activityLoading: true, defaultTab: "posts", posts: [] });
    expect(t).toContain("Could not load profile activity.");
  });
});
