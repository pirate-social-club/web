import { describe, expect, test } from "bun:test";

import {
  resolveSovereignApexRedirect,
  sovereignApexRedirectResponse,
} from "@/app/sovereign-origin-redirect";

describe("resolveSovereignApexRedirect", () => {
  test("moves the raw root community page to the app thread route", () => {
    expect(resolveSovereignApexRedirect({
      communityId: "com_test",
      communityRoute: "community-route",
      effectiveUrl: "https://community-root/?sort=top",
    })).toBe("https://app.community-root/c/community-route/threads?sort=top");
  });

  test("makes sovereign redirects uncacheable at every response cache layer", () => {
    const response = sovereignApexRedirectResponse("https://app.community-root/c/community-route/threads");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.community-root/c/community-route/threads");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(response.headers.get("cache-tag")).toBeNull();
  });

  test("preserves explicit post paths while moving them to the app origin", () => {
    expect(resolveSovereignApexRedirect({
      communityId: "com_test",
      communityRoute: "xn--pokmon-dva",
      effectiveUrl: "https://xn--pokmon-dva/p/post_test#comments",
    })).toBe("https://app.xn--pokmon-dva/p/post_test#comments");
  });

  test("does not redirect app or canonical origins", () => {
    expect(resolveSovereignApexRedirect({
      communityId: "com_test",
      communityRoute: "community-route",
      effectiveUrl: "https://app.community-root/",
    })).toBeNull();
    expect(resolveSovereignApexRedirect({
      communityId: null,
      effectiveUrl: "https://pirate.sc/",
    })).toBeNull();
  });
});
