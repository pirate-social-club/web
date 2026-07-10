import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";

import { getLocaleMessages } from "./locales";
import {
  renderPublicProfileErrorPage,
  renderPublicProfilePage,
} from "./worker-public-html";

describe("public profile HTML", () => {
  test("keeps a hostile cover URL inside the image src attribute", () => {
    const coverRef = 'https://media.example/cover.jpg" onerror="alert(1)';
    const html = renderPublicProfilePage({
      appOrigin: "https://pirate.sc",
      canonicalUrl: "https://ada.pirate/",
      communities: [],
      copy: getLocaleMessages("en", "routes").publicProfile,
      displayHandle: "ada.pirate",
      host: "ada.pirate",
      localeTag: "en",
      profile: {
        id: "usr_ada",
        object: "profile",
        display_name: "Ada",
        cover_ref: coverRef,
        global_handle: {
          id: "hdl_ada",
          label: "ada.pirate",
          object: "global_handle",
          tier: "standard",
          status: "active",
          issuance_source: "generated_signup",
          issued_at: 1_700_000_000,
        },
        created: 1_700_000_000,
      },
    });

    const { document } = parseHTML(html);
    const bannerImage = document.querySelector(".banner-image");
    expect(bannerImage?.getAttribute("src")).toBe(coverRef);
    expect(bannerImage?.hasAttribute("onerror")).toBe(false);
  });

  test("sets restrictive headers on public HTML errors", () => {
    const response = renderPublicProfileErrorPage("Not found", "Missing", 404);

    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
