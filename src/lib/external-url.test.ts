import { describe, expect, test } from "bun:test";

import { normalizeExternalHttpUrl } from "./external-url";

describe("normalizeExternalHttpUrl", () => {
  test("keeps explicit HTTP(S) URLs", () => {
    expect(normalizeExternalHttpUrl(" https://instagram.com/svetsafita ")).toBe("https://instagram.com/svetsafita");
  });

  test("upgrades schemeless external URLs", () => {
    expect(normalizeExternalHttpUrl("instagram.com/svetsafita")).toBe("https://instagram.com/svetsafita");
    expect(normalizeExternalHttpUrl("soundcloud.com/artist/tracks")).toBe("https://soundcloud.com/artist/tracks");
  });

  test("rejects values that would become relative links", () => {
    expect(normalizeExternalHttpUrl("instagram")).toBeNull();
    expect(normalizeExternalHttpUrl("/c/instagram.com/svetsafita")).toBeNull();
  });
});
