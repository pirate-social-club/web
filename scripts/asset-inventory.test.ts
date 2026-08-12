import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import {
  generateAssetInventory,
  measureAssetInventory,
  requestEncodedAsset,
} from "./asset-inventory";

const tempRoots: string[] = [];
const sha = (digit: string) => digit.repeat(40);

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): { assetsDirectory: string; buildInfoPath: string; outputPath: string } {
  const root = mkdtempSync(resolve(tmpdir(), "web-asset-inventory-"));
  tempRoots.push(root);
  const assetsDirectory = resolve(root, "dist/client/assets");
  mkdirSync(resolve(assetsDirectory, "nested"), { recursive: true });
  writeFileSync(resolve(assetsDirectory, "route-b.js"), "route-b");
  writeFileSync(resolve(assetsDirectory, "nested/route-a.js"), "route-a");
  const buildInfoPath = resolve(root, "dist/build-info.json");
  writeFileSync(buildInfoPath, JSON.stringify({
    schemaVersion: 3,
    releaseId: createHash("sha256").update(JSON.stringify({
      apiSha: sha("b"),
      coreSha: sha("c"),
      webSha: sha("a"),
    })).digest("hex"),
    buildId: "build-123",
    builtAt: "2026-08-12T00:00:00.000Z",
    webSha: sha("a"),
    apiSha: sha("b"),
    coreSha: sha("c"),
    deployReasonSlug: null,
    sourceState: "clean",
    hotfix: null,
  }));
  return {
    assetsDirectory,
    buildInfoPath,
    outputPath: resolve(root, "dist/asset-inventory.json"),
  };
}

describe("release asset inventory", () => {
  test("inventories every emitted asset recursively with stable paths, hashes, and raw sizes", () => {
    const paths = fixture();
    const inventory = generateAssetInventory(paths);

    expect(inventory.build.buildId).toBe("build-123");
    expect(inventory.assets.map((asset) => asset.url)).toEqual([
      "/assets/nested/route-a.js",
      "/assets/route-b.js",
    ]);
    expect(inventory.totals).toEqual({
      count: 2,
      uncompressedBytes: 14,
      encodedBytes: null,
    });
    expect(inventory.assets[0]?.sha256).toBe(
      createHash("sha256").update("route-a").digest("hex"),
    );
    expect(JSON.parse(readFileSync(paths.outputPath, "utf8"))).toEqual(inventory);
  });

  test("records the actual encoded response bytes and encoding for every asset", async () => {
    const inventory = generateAssetInventory(fixture());
    const measured = await measureAssetInventory({
      inventory,
      origin: "https://pirate.test",
      measuredAt: "2026-08-12T01:00:00.000Z",
      requestAsset: async (url) => ({
        httpStatus: 200,
        contentEncoding: url.pathname.includes("route-a") ? "zstd" : "br",
        encodedBytes: url.pathname.includes("route-a") ? 3 : 4,
        contentLengthHeader: null,
        cacheControl: "public, max-age=31536000, immutable",
        cacheStatus: "HIT",
        etag: '"hash"',
      }),
    });

    expect(measured.edgeMeasurement).toEqual({
      origin: "https://pirate.test",
      measuredAt: "2026-08-12T01:00:00.000Z",
      acceptEncoding: "zstd, br, gzip",
      succeeded: 2,
      failed: 0,
    });
    expect(measured.totals.encodedBytes).toBe(7);
    expect(measured.assets.map((asset) => asset.edge)).toEqual([
      expect.objectContaining({ status: "ok", contentEncoding: "zstd", encodedBytes: 3 }),
      expect.objectContaining({ status: "ok", contentEncoding: "br", encodedBytes: 4 }),
    ]);
  });

  test("counts the encoded response body without transparently decompressing it", async () => {
    const compressed = gzipSync("console.log('asset response')");
    let acceptEncoding: string | undefined;
    const server = createServer((request, response) => {
      acceptEncoding = request.headers["accept-encoding"];
      response.writeHead(200, {
        "content-encoding": "gzip",
        "content-length": compressed.byteLength,
        "cache-control": "public, max-age=31536000, immutable",
        "cf-cache-status": "HIT",
        etag: '"asset-etag"',
      });
      response.end(compressed);
    });
    await new Promise<void>((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("test server has no TCP address");
      const measurement = await requestEncodedAsset(
        new URL(`http://127.0.0.1:${address.port}/assets/test.js`),
      );
      expect(acceptEncoding).toBe("zstd, br, gzip");
      expect(measurement).toEqual({
        httpStatus: 200,
        contentEncoding: "gzip",
        encodedBytes: compressed.byteLength,
        contentLengthHeader: compressed.byteLength,
        cacheControl: "public, max-age=31536000, immutable",
        cacheStatus: "HIT",
        etag: '"asset-etag"',
      });
    } finally {
      await new Promise<void>((resolvePromise, reject) => {
        server.close((error) => (error ? reject(error) : resolvePromise()));
      });
    }
  });

  test("preserves partial evidence and withholds the encoded total when a probe fails", async () => {
    const inventory = generateAssetInventory(fixture());
    const measured = await measureAssetInventory({
      inventory,
      origin: "https://pirate.test",
      requestAsset: async (url) => {
        if (url.pathname.includes("route-b")) throw new Error("gateway unavailable");
        return {
          httpStatus: 200,
          contentEncoding: "zstd",
          encodedBytes: 3,
          contentLengthHeader: 3,
          cacheControl: null,
          cacheStatus: null,
          etag: null,
        };
      },
    });

    expect(measured.edgeMeasurement?.failed).toBe(1);
    expect(measured.totals.encodedBytes).toBeNull();
    expect(measured.assets[1]?.edge).toEqual({ status: "error", error: "gateway unavailable" });
  });
});
