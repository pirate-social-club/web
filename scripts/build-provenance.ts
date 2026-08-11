import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const rootDir = resolve(import.meta.dir, "..");
const sourcePath = resolve(rootDir, "build-info.json");
const distPath = resolve(rootDir, "dist", "build-info.json");

export type WebBuildProvenance = {
  schemaVersion: 2;
  releaseId: string;
  buildId: string;
  builtAt: string;
  webSha: string;
  apiSha: string;
  coreSha: string;
  sourceState: "clean" | "dirty";
  hotfix: null | {
    reasonSlug: string;
    patchSha256: string;
  };
};

function reasonSlug(value: string | undefined): string {
  return (value ?? "local-build")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "local-build";
}

function worktreePatchSha256(repoRoot: string): string {
  const hash = createHash("sha256");
  hash.update("tracked\0");
  hash.update(execFileSync("git", ["diff", "--binary", "--no-ext-diff", "HEAD"], {
    cwd: repoRoot,
    maxBuffer: 64 * 1024 * 1024,
  }));
  const untracked = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  ).split("\0").filter(Boolean).sort();
  for (const path of untracked) {
    const absolutePath = resolve(repoRoot, path);
    hash.update("untracked\0");
    hash.update(path);
    hash.update("\0");
    hash.update(lstatSync(absolutePath).isSymbolicLink()
      ? `symlink:${readlinkSync(absolutePath)}`
      : readFileSync(absolutePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function inspectSourceState(repoRoot: string, reason?: string): Pick<WebBuildProvenance, "sourceState" | "hotfix"> {
  const dirty = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd: repoRoot, encoding: "utf8" },
  ).trim().length > 0;
  return dirty
    ? {
        sourceState: "dirty",
        hotfix: {
          reasonSlug: reasonSlug(reason),
          patchSha256: worktreePatchSha256(repoRoot),
        },
      }
    : { sourceState: "clean", hotfix: null };
}

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
  options: {
    apiSha?: string;
    buildId?: string;
    builtAt?: string;
    coreSha?: string;
    hotfixReason?: string;
  } = {},
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
  const source = inspectSourceState(repoRoot, options.hotfixReason);

  return {
    schemaVersion: 2,
    releaseId,
    buildId: options.buildId ?? randomUUID(),
    builtAt: options.builtAt ?? new Date().toISOString(),
    webSha,
    apiSha,
    coreSha,
    ...source,
  };
}

export function parseBuildProvenance(raw: string): WebBuildProvenance {
  const value = JSON.parse(raw) as Partial<WebBuildProvenance>;
  if (value.schemaVersion !== 2) throw new Error("build provenance schemaVersion must be 2");
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
  if (value.sourceState !== "clean" && value.sourceState !== "dirty") {
    throw new Error("build provenance sourceState must be clean or dirty");
  }
  if (value.sourceState === "clean" && value.hotfix !== null) {
    throw new Error("clean build provenance must not contain hotfix metadata");
  }
  if (value.sourceState === "dirty") {
    if (!value.hotfix || typeof value.hotfix !== "object") {
      throw new Error("dirty build provenance requires hotfix metadata");
    }
    if (!value.hotfix.reasonSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.hotfix.reasonSlug)) {
      throw new Error("dirty build provenance requires a normalized hotfix reasonSlug");
    }
    if (!/^[0-9a-f]{64}$/.test(value.hotfix.patchSha256)) {
      throw new Error("dirty build provenance requires a lowercase patch SHA-256 digest");
    }
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
      hotfixReason: process.env.PIRATE_BUILD_HOTFIX_REASON,
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
  if (command === "inspect-source") {
    const [repoRoot, reason] = args.slice(1);
    if (!repoRoot) throw new Error("inspect-source requires a repository path");
    process.stdout.write(JSON.stringify(inspectSourceState(resolve(repoRoot), reason)));
    return;
  }
  throw new Error(`unknown build provenance command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2));
}
