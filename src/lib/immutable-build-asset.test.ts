import { describe, expect, test } from "bun:test";

import {
  applyImmutableBuildAssetCacheHeader,
  IMMUTABLE_BUILD_ASSET_CACHE_CONTROL,
  isHashedBuildAssetPath,
} from "./immutable-build-asset";

describe("immutable build assets", () => {
  test("recognizes Vite hash-named assets", () => {
    expect(isHashedBuildAssetPath("/assets/client-Bk8h6irO.js")).toBe(true);
    expect(isHashedBuildAssetPath("/assets/video-player-D0Fmmkw-.css")).toBe(true);
    expect(isHashedBuildAssetPath("/assets/client.js")).toBe(false);
    expect(isHashedBuildAssetPath("/favicon-96x96.png")).toBe(false);
  });

  test("sets a one-year immutable policy on successful asset responses", async () => {
    const response = applyImmutableBuildAssetCacheHeader(
      new Request("https://pirate.sc/assets/client-Bk8h6irO.js"),
      new Response("module", {
        headers: { "cache-control": "public, max-age=0, must-revalidate" },
      }),
    );

    expect(response.headers.get("cache-control")).toBe(IMMUTABLE_BUILD_ASSET_CACHE_CONTROL);
    expect(await response.text()).toBe("module");
  });

  test("does not cache unhashed, failed, or mutating responses", () => {
    const original = new Response("dynamic", { status: 200 });
    expect(
      applyImmutableBuildAssetCacheHeader(
        new Request("https://pirate.sc/assets/client.js"),
        original,
      ),
    ).toBe(original);
    expect(
      applyImmutableBuildAssetCacheHeader(
        new Request("https://pirate.sc/assets/client-Bk8h6irO.js"),
        new Response("missing", { status: 404 }),
      ).status,
    ).toBe(404);
    expect(
      applyImmutableBuildAssetCacheHeader(
        new Request("https://pirate.sc/assets/client-Bk8h6irO.js", { method: "POST" }),
        original,
      ),
    ).toBe(original);
  });
});
