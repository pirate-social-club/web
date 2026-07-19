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

describe("ProfilePage Book tab visibility", () => {
  test("no Book tab when bookPanel is absent (non-bookable / no panel)", () => {
    const t = render({});
    expect(t).not.toContain("Book"); // no Book trigger among Overview/Posts/Comments
  });

  test("Book tab trigger appears when a bookPanel is provided", () => {
    const t = render({ bookPanel: <div>BOOKPANEL_MARKER</div> });
    expect(t).toContain("Book"); // desktop tab label
  });

  test("book panel content mounts when the Book tab is active", () => {
    const t = render({ defaultTab: "book", bookPanel: <div>BOOKPANEL_MARKER</div> });
    expect(t).toContain("BOOKPANEL_MARKER");
  });
});
