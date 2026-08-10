import { describe, expect, test } from "bun:test";

import { verifySovereignHtml } from "./sovereign-context.mjs";

const input = {
  communityId: "com_cmt_sovereign_probe",
  root: "dankmeme",
};

function page(extra = "") {
  return [
    '<link rel="canonical" href="https://dankmeme/">',
    "<script>",
    `var publicUrl="/public-communities/com_cmt_sovereign_probe/feed/videos";${extra}`,
    "window.__pirateHomeVideoFeedBootstrap={};",
    "</script>",
  ].join("\n");
}

describe("sovereign production context", () => {
  test("accepts the scoped video bootstrap", () => {
    expect(verifySovereignHtml(page(), input)).toMatchObject({
      canonical: "https://dankmeme/",
      errors: [],
    });
  });

  test("rejects canonical fallback and missing scope", () => {
    const result = verifySovereignHtml('<link rel="canonical" href="https://pirate.sc/">', input);
    expect(result.errors).toEqual([
      'canonical="https://pirate.sc/" expected="https://dankmeme/"',
      "missing home-video bootstrap script",
    ]);
  });

  test("rejects global and thread-feed bootstraps", () => {
    const result = verifySovereignHtml(page([
      "/feed/home/videos/public",
      "/public-communities/com_cmt_sovereign_probe/posts",
    ].join("\n")), input);
    expect(result.errors).toEqual([
      "global video feed bootstrap is present",
      "thread-feed bootstrap is present on the sovereign apex",
    ]);
  });
});
