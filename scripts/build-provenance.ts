import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const rootDir = resolve(import.meta.dir, "..");
const sourcePath = resolve(rootDir, "build-info.json");
const distPath = resolve(rootDir, "dist", "build-info.json");

export type WebBuildProvenance = {
  schemaVersion: 1;
  releaseId: string;
  buildId: string;
  builtAt: string;
  webSha: string;
  apiSha: string;
  coreSha: string;
};

function releaseIdFor(webSha: string, apiSha: string, coreSha: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ apiSha, coreSha, webSha }))
    .digest("hex");
}

function requireFullSha(value: string, label: string): string {
  const normalized = value.trim();
  if (!SHA_PATTERN.test(normalized)) {
    throw new Error(`${label} must contain one full lowercase commit SHA`);
  }
  return normalized;
}

function readPinnedSha(repoRoot: string, relativePath: string, label: string): string {
  return requireFullSha(readFileSync(resolve(repoRoot, relativePath), "utf8"), label);
}

export function createBuildProvenance(
  repoRoot: string,
  options: { apiSha?: string; buildId?: string; builtAt?: string; coreSha?: string } = {},
): WebBuildProvenance {
  const webSha = requireFullSha(
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }),
    "Web checkout",
  );
  const apiSha = options.apiSha
    ? requireFullSha(options.apiSha, "API build SHA")
    : readPinnedSha(repoRoot, ".github/release-refs/api.sha", "API release pin");
  const coreSha = options.coreSha
    ? requireFullSha(options.coreSha, "Core build SHA")
    : readPinnedSha(repoRoot, ".github/release-refs/core.sha", "Core release pin");
  const releaseId = releaseIdFor(webSha, apiSha, coreSha);

  return {
    schemaVersion: 1,
    releaseId,
    buildId: options.buildId ?? randomUUID(),
    builtAt: options.builtAt ?? new Date().toISOString(),
    webSha,
    apiSha,
    coreSha,
  };
}

export function parseBuildProvenance(raw: string): WebBuildProvenance {
  const value = JSON.parse(raw) as Partial<WebBuildProvenance>;
  if (value.schemaVersion !== 1) throw new Error("build provenance schemaVersion must be 1");
  for (const [field, sha] of [
    ["webSha", value.webSha],
    ["apiSha", value.apiSha],
    ["coreSha", value.coreSha],
  ] as const) {
    requireFullSha(String(sha ?? ""), field);
  }
  if (!/^[0-9a-f]{64}$/.test(String(value.releaseId ?? ""))) {
    throw new Error("build provenance releaseId must be one lowercase SHA-256 digest");
  }
  if (value.releaseId !== releaseIdFor(value.webSha!, value.apiSha!, value.coreSha!)) {
    throw new Error("build provenance releaseId does not match the release triple");
  }
  if (!value.buildId || typeof value.buildId !== "string") {
    throw new Error("build provenance buildId is required");
  }
  if (!value.builtAt || !Number.isFinite(Date.parse(value.builtAt))) {
    throw new Error("build provenance builtAt must be an ISO timestamp");
  }
  return value as WebBuildProvenance;
}

export function writeBuildProvenance(path: string, provenance: WebBuildProvenance): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(provenance, null, 2)}\n`);
}

export function assertDistBuildProvenance(
  expected: Pick<WebBuildProvenance, "webSha" | "apiSha" | "coreSha">,
  path = distPath,
): WebBuildProvenance {
  const actual = parseBuildProvenance(readFileSync(path, "utf8"));
  for (const field of ["webSha", "apiSha", "coreSha"] as const) {
    if (actual[field] !== expected[field]) {
      throw new Error(`dist build provenance ${field} mismatch: expected ${expected[field]}, got ${actual[field]}`);
    }
  }
  return actual;
}

function main(args: string[]): void {
  const command = args[0] ?? "generate";
  if (command === "generate") {
    const provenance = createBuildProvenance(rootDir, {
      apiSha: process.env.PIRATE_BUILD_API_SHA,
      coreSha: process.env.PIRATE_BUILD_CORE_SHA,
    });
    writeBuildProvenance(sourcePath, provenance);
    console.info(`[web] build-info.json -> ${provenance.webSha.slice(0, 12)} (${provenance.buildId})`);
    return;
  }
  if (command === "emit-dist") {
    const provenance = parseBuildProvenance(readFileSync(sourcePath, "utf8"));
    writeBuildProvenance(distPath, provenance);
    console.info(`[web] dist/build-info.json -> ${provenance.webSha.slice(0, 12)} (${provenance.buildId})`);
    return;
  }
  if (command === "verify-dist") {
    const [webSha, apiSha, coreSha] = args.slice(1);
    const provenance = assertDistBuildProvenance({
      webSha: requireFullSha(webSha ?? "", "expected Web SHA"),
      apiSha: requireFullSha(apiSha ?? "", "expected API SHA"),
      coreSha: requireFullSha(coreSha ?? "", "expected Core SHA"),
    });
    console.info(`[web] verified dist provenance ${provenance.buildId}`);
    return;
  }
  throw new Error(`unknown build provenance command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2));
}
