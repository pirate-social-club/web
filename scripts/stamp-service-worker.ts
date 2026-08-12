import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const BUILD_ID_MARKER = "__PIRATE_BUILD_ID__";
const ASSET_MANIFEST_MARKER = "__PIRATE_ASSET_MANIFEST__";
const BUILD_ID_PATTERN = /^[a-zA-Z0-9._-]{1,80}$/;

export function stampServiceWorker(options: {
  assetsDirectory: string;
  buildInfoPath: string;
  serviceWorkerPath: string;
}): string {
  const buildInfo = JSON.parse(readFileSync(options.buildInfoPath, "utf8")) as {
    buildId?: unknown;
  };
  const buildId = String(buildInfo.buildId ?? "").trim();
  if (!BUILD_ID_PATTERN.test(buildId)) {
    throw new Error("build provenance buildId must be a safe cache identifier");
  }

  const source = readFileSync(options.serviceWorkerPath, "utf8");
  if (source.split(BUILD_ID_MARKER).length !== 2) {
    throw new Error(`service worker must contain exactly one ${BUILD_ID_MARKER} marker`);
  }
  if (source.split(ASSET_MANIFEST_MARKER).length !== 2) {
    throw new Error(`service worker must contain exactly one ${ASSET_MANIFEST_MARKER} marker`);
  }

  const assetUrls = readdirSync(options.assetsDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = resolve(entry.parentPath, entry.name);
      return `/assets/${relative(options.assetsDirectory, path).split(sep).join("/")}`;
    })
    .sort();
  if (assetUrls.length === 0) throw new Error("service worker asset manifest cannot be empty");

  writeFileSync(options.serviceWorkerPath, source
    .replace(BUILD_ID_MARKER, buildId)
    .replace(`"${ASSET_MANIFEST_MARKER}"`, JSON.stringify(assetUrls)));
  return buildId;
}

function main(): void {
  const root = resolve(import.meta.dir, "..");
  const buildId = stampServiceWorker({
    assetsDirectory: resolve(root, "dist/client/assets"),
    buildInfoPath: resolve(root, "build-info.json"),
    serviceWorkerPath: resolve(root, "dist/client/sw.js"),
  });
  console.info(`[web] stamped service worker cache release ${buildId}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
