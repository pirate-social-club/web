import { describe, expect, test } from "bun:test";

import {
  buildCanonicalCommunityRoutePathname,
  buildCommunityPath,
  canonicalizeCommunityRouteSegment,
  formatCommunityRouteLabel,
} from "./community-routing";

describe("buildCommunityPath", () => {
  test("prefers the route slug when available", () => {
    expect(buildCommunityPath("cmt_test", "builders")).toBe("/c/builders");
  });

  test("keeps Spaces route markers readable", () => {
    expect(buildCommunityPath("cmt_test", "@xn--t77hga")).toBe("/c/@xn--t77hga");
  });

  test("canonicalizes raw emoji handles to Spaces punycode", () => {
    expect(buildCommunityPath("cmt_test", "@🇵🇸")).toBe("/c/@xn--t77hga");
  });

  test("falls back to the community id when no route slug exists", () => {
    expect(buildCommunityPath("cmt_test", null)).toBe("/c/cmt_test");
  });
});

describe("canonicalizeCommunityRouteSegment", () => {
  test("converts raw emoji handles to punycode route slugs", () => {
    expect(canonicalizeCommunityRouteSegment("@🇵🇸")).toBe("@xn--t77hga");
  });

  test("leaves existing punycode and ascii labels unchanged", () => {
    expect(canonicalizeCommunityRouteSegment("@xn--t77hga")).toBe("@xn--t77hga");
    expect(canonicalizeCommunityRouteSegment("builders")).toBe("builders");
  });
});

describe("buildCanonicalCommunityRoutePathname", () => {
  test("replaces public community IDs with verified route slugs", () => {
    expect(buildCanonicalCommunityRoutePathname(
      "/c/com_cmt_be13447e169a49209b2dc207fc4574c0",
      "com_cmt_be13447e169a49209b2dc207fc4574c0",
      "@xn--t77hga",
    )).toBe("/c/@xn--t77hga");
  });

  test("preserves community route suffixes", () => {
    expect(buildCanonicalCommunityRoutePathname(
      "/c/cmt_be13447e169a49209b2dc207fc4574c0/mod/links",
      "com_cmt_be13447e169a49209b2dc207fc4574c0",
      "@xn--t77hga",
    )).toBe("/c/@xn--t77hga/mod/links");
  });

  test("does not rewrite already canonical community paths", () => {
    expect(buildCanonicalCommunityRoutePathname(
      "/c/@xn--t77hga",
      "com_cmt_be13447e169a49209b2dc207fc4574c0",
      "@xn--t77hga",
    )).toBeNull();
  });
});

describe("formatCommunityRouteLabel", () => {
  test("renders Spaces punycode route slugs as emoji labels", () => {
    expect(formatCommunityRouteLabel("cmt_test", "@xn--t77hga")).toBe("c/@🇵🇸");
  });

  test("keeps canonical paths separate from display labels", () => {
    expect(buildCommunityPath("cmt_test", "@xn--t77hga")).toBe("/c/@xn--t77hga");
    expect(formatCommunityRouteLabel("cmt_test", "@xn--t77hga")).toBe("c/@🇵🇸");
  });

  test("leaves invalid punycode labels unchanged", () => {
    expect(formatCommunityRouteLabel("cmt_test", "@xn--238746723487")).toBe("c/@xn--238746723487");
  });

  test("falls back to community id display when no route slug exists", () => {
    expect(formatCommunityRouteLabel("cmt_test", null)).toBe("c/cmt_test");
  });

  test("normalizes an existing community label prefix before decoding", () => {
    expect(formatCommunityRouteLabel("cmt_test", "c/@xn--t77hga")).toBe("c/@🇵🇸");
  });
});
