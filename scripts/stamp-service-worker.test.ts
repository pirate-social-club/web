import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { stampServiceWorker } from "./stamp-service-worker";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(source: string) {
  const root = mkdtempSync(resolve(tmpdir(), "web-sw-stamp-"));
  tempRoots.push(root);
  const buildInfoPath = resolve(root, "build-info.json");
  const serviceWorkerPath = resolve(root, "sw.js");
  const assetsDirectory = resolve(root, "assets");
  mkdirSync(assetsDirectory, { recursive: true });
  writeFileSync(resolve(assetsDirectory, "app-hash.js"), "app");
  writeFileSync(buildInfoPath, JSON.stringify({ buildId: "12345678-abcd-4abc-8abc-1234567890ab" }));
  writeFileSync(serviceWorkerPath, source);
  return { assetsDirectory, buildInfoPath, serviceWorkerPath };
}

describe("service worker release stamp", () => {
  test("embeds the exact build identity in the immutable cache name", () => {
    const paths = fixture('const BUILD_RELEASE = "__PIRATE_BUILD_ID__"; const ASSETS = "__PIRATE_ASSET_MANIFEST__";');
    expect(stampServiceWorker(paths)).toBe("12345678-abcd-4abc-8abc-1234567890ab");
    expect(readFileSync(paths.serviceWorkerPath, "utf8"))
      .toBe('const BUILD_RELEASE = "12345678-abcd-4abc-8abc-1234567890ab"; const ASSETS = ["/assets/app-hash.js"];');
  });

  test("fails closed when the built worker loses its release marker", () => {
    const paths = fixture('const BUILD_RELEASE = "missing"; const ASSETS = "__PIRATE_ASSET_MANIFEST__";');
    expect(() => stampServiceWorker(paths)).toThrow("must contain exactly one");
  });

  test("fails closed when the built worker loses its asset manifest marker", () => {
    const paths = fixture('const BUILD_RELEASE = "__PIRATE_BUILD_ID__";');
    expect(() => stampServiceWorker(paths)).toThrow("ASSET_MANIFEST");
  });
});
