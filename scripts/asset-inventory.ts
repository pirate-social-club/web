import { createHash } from "node:crypto";
import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseBuildProvenance, type WebBuildProvenance } from "./build-provenance";

const ACCEPT_ENCODING = "zstd, br, gzip";
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_TIMEOUT_MS = 15_000;

export type AssetEdgeMeasurement = {
  status: "ok";
  httpStatus: number;
  contentEncoding: string;
  encodedBytes: number;
  contentLengthHeader: number | null;
  cacheControl: string | null;
  cacheStatus: string | null;
  etag: string | null;
};

export type AssetEdgeFailure = {
  status: "error";
  error: string;
};

export type AssetInventoryEntry = {
  url: string;
  sha256: string;
  uncompressedBytes: number;
  edge: AssetEdgeMeasurement | AssetEdgeFailure | null;
};

export type AssetInventory = {
  schemaVersion: 1;
  build: Pick<
    WebBuildProvenance,
    "releaseId" | "buildId" | "builtAt" | "webSha" | "apiSha" | "coreSha"
  >;
  assetBasePath: "/assets/";
  generatedFrom: "dist/client/assets";
  edgeMeasurement: null | {
    origin: string;
    measuredAt: string;
    acceptEncoding: string;
    succeeded: number;
    failed: number;
  };
  totals: {
    count: number;
    uncompressedBytes: number;
    encodedBytes: number | null;
  };
  assets: AssetInventoryEntry[];
};

type RawEdgeResponse = Omit<AssetEdgeMeasurement, "status">;

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function listFiles(root: string, directory = root): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(root, path));
      continue;
    }
    if (!entry.isFile() || lstatSync(path).isSymbolicLink()) {
      throw new Error(`asset inventory refuses non-regular file ${relative(root, path)}`);
    }
    files.push(path);
  }
  return files;
}

function assetUrl(assetsDirectory: string, absolutePath: string): string {
  const path = relative(assetsDirectory, absolutePath).split(sep).join("/");
  if (!path || path.startsWith("../")) {
    throw new Error(`asset path escapes inventory root: ${absolutePath}`);
  }
  return `/assets/${path}`;
}

export function generateAssetInventory(options: {
  assetsDirectory: string;
  buildInfoPath: string;
  outputPath: string;
}): AssetInventory {
  const provenance = parseBuildProvenance(readFileSync(options.buildInfoPath, "utf8"));
  const assets = listFiles(options.assetsDirectory)
    .map((path): AssetInventoryEntry => {
      const bytes = readFileSync(path);
      return {
        url: assetUrl(options.assetsDirectory, path),
        sha256: createHash("sha256").update(bytes).digest("hex"),
        uncompressedBytes: bytes.byteLength,
        edge: null,
      };
    })
    .sort((a, b) => a.url.localeCompare(b.url));
  if (assets.length === 0) throw new Error("asset inventory cannot be empty");

  const inventory: AssetInventory = {
    schemaVersion: 1,
    build: {
      releaseId: provenance.releaseId,
      buildId: provenance.buildId,
      builtAt: provenance.builtAt,
      webSha: provenance.webSha,
      apiSha: provenance.apiSha,
      coreSha: provenance.coreSha,
    },
    assetBasePath: "/assets/",
    generatedFrom: "dist/client/assets",
    edgeMeasurement: null,
    totals: {
      count: assets.length,
      uncompressedBytes: assets.reduce((total, asset) => total + asset.uncompressedBytes, 0),
      encodedBytes: null,
    },
    assets,
  };
  writeJson(options.outputPath, inventory);
  return inventory;
}

function stringHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? null;
}

function numericHeader(value: string | string[] | undefined): number | null {
  const parsed = Number.parseInt(stringHeader(value) ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function requestEncodedAsset(
  url: URL,
  options: { timeoutMs?: number } = {},
): Promise<RawEdgeResponse> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return Promise.reject(new Error(`unsupported asset URL protocol ${url.protocol}`));
  }
  const request = url.protocol === "https:" ? requestHttps : requestHttp;
  return new Promise((resolvePromise, reject) => {
    const req = request(url, {
      headers: {
        "accept-encoding": ACCEPT_ENCODING,
        "user-agent": "pirate-release-asset-inventory/1",
      },
    }, (response) => {
      let encodedBytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        encodedBytes += Buffer.byteLength(chunk);
      });
      response.on("end", () => {
        const httpStatus = response.statusCode ?? 0;
        if (httpStatus !== 200) {
          reject(new Error(`HTTP ${httpStatus}`));
          return;
        }
        const contentLengthHeader = numericHeader(response.headers["content-length"]);
        if (contentLengthHeader !== null && contentLengthHeader !== encodedBytes) {
          reject(new Error(
            `content-length mismatch: header ${contentLengthHeader}, received ${encodedBytes}`,
          ));
          return;
        }
        resolvePromise({
          httpStatus,
          contentEncoding: stringHeader(response.headers["content-encoding"]) ?? "identity",
          encodedBytes,
          contentLengthHeader,
          cacheControl: stringHeader(response.headers["cache-control"]),
          cacheStatus: stringHeader(response.headers["cf-cache-status"]),
          etag: stringHeader(response.headers.etag),
        });
      });
    });
    req.setTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, () => {
      req.destroy(new Error(`request timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}

function parseInventory(raw: string): AssetInventory {
  const inventory = JSON.parse(raw) as Partial<AssetInventory>;
  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.assets)) {
    throw new Error("asset inventory must use schemaVersion 1");
  }
  if (!inventory.build?.buildId || !inventory.build.releaseId) {
    throw new Error("asset inventory is missing build identity");
  }
  return inventory as AssetInventory;
}

export async function measureAssetInventory(options: {
  inventory: AssetInventory;
  origin: string;
  measuredAt?: string;
  concurrency?: number;
  requestAsset?: (url: URL) => Promise<RawEdgeResponse>;
}): Promise<AssetInventory> {
  const origin = new URL(options.origin);
  if ((origin.protocol !== "https:" && origin.protocol !== "http:")
    || origin.username || origin.password || origin.pathname !== "/"
    || origin.search || origin.hash) {
    throw new Error("edge origin must be an HTTP(S) URL without credentials, query, or fragment");
  }
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 32) {
    throw new Error("edge measurement concurrency must be an integer from 1 to 32");
  }
  const requestAsset = options.requestAsset ?? requestEncodedAsset;
  const assets: AssetInventoryEntry[] = options.inventory.assets
    .map((asset) => ({ ...asset, edge: null }));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < assets.length) {
      const index = cursor++;
      const asset = assets[index]!;
      try {
        const url = new URL(asset.url, origin);
        if (url.origin !== origin.origin || !url.pathname.startsWith("/assets/")
          || url.search || url.hash) {
          throw new Error(`asset URL is outside the immutable asset namespace: ${asset.url}`);
        }
        const measured = await requestAsset(url);
        asset.edge = { status: "ok", ...measured };
      } catch (error) {
        asset.edge = {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, assets.length) }, () => worker()));

  const successful = assets.filter(
    (asset): asset is AssetInventoryEntry & { edge: AssetEdgeMeasurement } => asset.edge?.status === "ok",
  );
  return {
    ...options.inventory,
    edgeMeasurement: {
      origin: origin.origin,
      measuredAt: options.measuredAt ?? new Date().toISOString(),
      acceptEncoding: ACCEPT_ENCODING,
      succeeded: successful.length,
      failed: assets.length - successful.length,
    },
    totals: {
      ...options.inventory.totals,
      encodedBytes: successful.length === assets.length
        ? successful.reduce((total, asset) => total + asset.edge.encodedBytes, 0)
        : null,
    },
    assets,
  };
}

function argument(args: string[], name: string, fallback?: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main(args: string[]): Promise<void> {
  const root = resolve(import.meta.dir, "..");
  const command = args[0];
  if (command === "generate") {
    const outputPath = resolve(argument(args, "--output", "dist/asset-inventory.json"));
    const inventory = generateAssetInventory({
      assetsDirectory: resolve(root, "dist/client/assets"),
      buildInfoPath: resolve(root, "dist/build-info.json"),
      outputPath,
    });
    console.info(
      `[web] asset inventory -> ${inventory.totals.count} files, ${inventory.totals.uncompressedBytes} raw bytes`,
    );
    return;
  }
  if (command === "measure-edge") {
    const inputPath = resolve(argument(args, "--input", "dist/asset-inventory.json"));
    const outputPath = resolve(argument(args, "--output", inputPath));
    const inventory = parseInventory(readFileSync(inputPath, "utf8"));
    const measured = await measureAssetInventory({
      inventory,
      origin: argument(args, "--origin"),
    });
    writeJson(outputPath, measured);
    console.info(
      `[web] edge asset inventory -> ${measured.edgeMeasurement?.succeeded}/${measured.totals.count} measured`,
    );
    if (measured.edgeMeasurement?.failed) {
      throw new Error(`${measured.edgeMeasurement.failed} edge asset measurements failed`);
    }
    return;
  }
  throw new Error("usage: asset-inventory.ts <generate|measure-edge> [options]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main(process.argv.slice(2));
}
