import { describe, expect, test } from "bun:test";

import {
  verifyBrandScopes,
  verifySovereignHtml,
  verifySurfaceNavigationContracts,
} from "./sovereign-context.mjs";

const input = {
  communityId: "com_cmt_sovereign_probe",
  root: "community-root",
  routeSlug: "community-route",
};

function apexPage(extra = "") {
  return [
    '<link rel="canonical" href="https://pirate.sc/c/community-route">',
    '<meta name="robots" content="noindex, nofollow">',
    extra,
  ].join("\n");
}

function appPage(extra = "") {
  return [
    '<link rel="canonical" href="https://pirate.sc/c/community-route">',
    '<meta name="robots" content="noindex, nofollow">',
    "<script>",
    `var publicUrl="/public-communities/com_cmt_sovereign_probe/feed/videos";${extra}`,
    "window.__pirateHomeVideoFeedBootstrap={};",
    "</script>",
  ].join("\n");
}

describe("sovereign production context", () => {
  test("accepts the community apex and scoped app video bootstrap", () => {
    expect(verifySovereignHtml(apexPage(), appPage(), input)).toMatchObject({
      apexCanonical: "https://pirate.sc/c/community-route",
      appCanonical: "https://pirate.sc/c/community-route",
      errors: [],
    });
  });

  test("rejects incorrect canonicals and missing app scope", () => {
    const result = verifySovereignHtml(
      '<link rel="canonical" href="https://community-root/">',
      '<link rel="canonical" href="https://app.community-root/">',
      input,
    );
    expect(result.errors).toEqual([
      'apex canonical="https://community-root/" expected="https://pirate.sc/c/community-route"',
      'app canonical="https://app.community-root/" expected="https://pirate.sc/c/community-route"',
      "missing noindex metadata on sovereign apex",
      "missing noindex metadata on sovereign app",
      "missing home-video bootstrap script on app origin",
    ]);
  });

  test("rejects the old apex-video mapping", () => {
    const result = verifySovereignHtml(appPage(), apexPage(), input);
    expect(result.errors).toEqual([
      "video bootstrap is present on the sovereign community apex",
      "missing home-video bootstrap script on app origin",
    ]);
  });

  test("rejects global and thread-feed bootstraps on the app", () => {
    const result = verifySovereignHtml(apexPage(), appPage([
      "/feed/home/videos/public",
      "/public-communities/com_cmt_sovereign_probe/posts",
    ].join("\n")), input);
    expect(result.errors).toEqual([
      "global video feed bootstrap is present",
      "thread-feed bootstrap is present on the sovereign video app",
    ]);
  });
});

describe("sovereign presentation scope", () => {
  const sovereignBrand = '<button data-brand-label="Dank Meme" data-brand-scope="community">D</button>';
  const pirateBrand = '<button data-brand-label="PIRATE" data-brand-scope="pirate">Pirate</button>';

  test("accepts community branding only on the sovereign origin", () => {
    expect(verifyBrandScopes(sovereignBrand, sovereignBrand, pirateBrand)).toEqual({
      errors: [],
      sovereignBrandLabel: "Dank Meme",
    });
  });

  test("rejects canonical community rebranding", () => {
    expect(verifyBrandScopes(sovereignBrand, sovereignBrand, sovereignBrand)).toEqual({
      errors: [
        "missing Pirate brand on the canonical community page",
        "community brand replaced Pirate on the canonical community page",
      ],
      sovereignBrandLabel: "Dank Meme",
    });
  });

  test("rejects Pirate branding on the sovereign origin", () => {
    expect(verifyBrandScopes(pirateBrand, pirateBrand, pirateBrand)).toEqual({
      errors: [
        "missing sovereign community brand",
        "Pirate brand is present on the sovereign apex",
        "missing community brand on the sovereign app",
        "Pirate brand is present on the sovereign app",
      ],
      sovereignBrandLabel: null,
    });
  });
});

describe("surface navigation contracts", () => {
  const navigation = (href: string) => (
    `<link data-surface-navigation-contract="true" href="${href}" rel="alternate"/>`
  );

  test("accepts reciprocal sovereign and canonical destinations", () => {
    expect(verifySurfaceNavigationContracts({
      apexHtml: navigation("https://app.community-root/"),
      appHtml: navigation("https://community-root/"),
      canonicalThreadsHtml: navigation("/c/community-route/videos"),
      canonicalVideosHtml: navigation("/c/community-route/threads"),
      root: input.root,
      routeSlug: input.routeSlug,
    }).errors).toEqual([]);
  });

  test("rejects missing and one-way destinations", () => {
    expect(verifySurfaceNavigationContracts({
      apexHtml: navigation("https://app.community-root/"),
      appHtml: "",
      canonicalThreadsHtml: navigation("/c/community-route/threads"),
      canonicalVideosHtml: navigation("/c/community-route/videos"),
      root: input.root,
      routeSlug: input.routeSlug,
    }).errors).toHaveLength(3);
  });
});
