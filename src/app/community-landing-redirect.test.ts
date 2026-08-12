import { describe, expect, test } from "bun:test";
import type { CommunityPreview } from "@pirate/api-contracts";

import { communityLandingPath, communityLandingRedirectResponse } from "./community-landing-redirect";

function preview(defaultSurface: "threads" | "videos"): CommunityPreview {
  return {
    avatar_ref: null,
    banner_ref: null,
    branding: { accent_color: null, header_style: "standard", tagline: null, theme: "system" },
    created: "2026-08-10T00:00:00.000Z",
    default_surface: defaultSurface,
    description: null,
    display_name: "Test Community",
    human_verification_lane: "self",
    id: "com_cmt_test",
    member_count: 0,
    membership_gate_summaries: [],
    membership_mode: "open",
    object: "community_preview",
    route_slug: "test-community",
    viewer_membership_status: null,
  } as CommunityPreview;
}

describe("community landing redirect", () => {
  test("keeps the canonical bare community route threads-first", () => {
    expect(communityLandingPath(preview("videos"))).toBe("/c/test-community/threads");
    expect(communityLandingPath(preview("threads"))).toBe("/c/test-community/threads");
  });

  test("tags a queryless 302 for cross-layer community purge", () => {
    const response = communityLandingRedirectResponse({
      effectiveUrl: "https://pirate.sc/c/test-community",
      preview: preview("videos"),
      sovereignPresentation: false,
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://pirate.sc/c/test-community/threads");
    expect(response.headers.get("cache-tag")).toBe("community:com_cmt_test");
    expect(response.headers.get("cdn-cache-control")).toContain("max-age=600");
  });

  test("preserves query parameters and disables caching", () => {
    const response = communityLandingRedirectResponse({
      effectiveUrl: "https://pirate.sc/c/test-community?ref=share",
      preview: preview("threads"),
      sovereignPresentation: false,
    });
    expect(response.headers.get("location")).toBe("https://pirate.sc/c/test-community/threads?ref=share");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("cache-tag")).toBeNull();
  });

  test("never shares sovereign redirects through the rewritten upstream URL cache key", () => {
    const response = communityLandingRedirectResponse({
      effectiveUrl: "https://baddie/",
      preview: preview("threads"),
      sovereignPresentation: true,
    });
    expect(response.headers.get("location")).toBe("https://baddie/c/test-community/threads");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(response.headers.get("cache-tag")).toBeNull();
  });
});
