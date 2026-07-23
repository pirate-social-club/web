import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { assertReleasePinDescends } from "./check-release-pin-ancestry.mjs";

const cleanupPaths = [];

function git(repoPath, ...args) {
  return execFileSync("git", ["-C", repoPath, ...args], { encoding: "utf8" }).trim();
}

function fixture() {
  const repoPath = mkdtempSync(join(tmpdir(), "api-pin-ancestry-"));
  cleanupPaths.push(repoPath);
  git(repoPath, "init");
  git(repoPath, "config", "user.email", "release-test@pirate.invalid");
  git(repoPath, "config", "user.name", "Release Test");
  git(repoPath, "commit", "--allow-empty", "-m", "root");
  const rootSha = git(repoPath, "rev-parse", "HEAD");
  git(repoPath, "commit", "--allow-empty", "-m", "base");
  const baseSha = git(repoPath, "rev-parse", "HEAD");
  git(repoPath, "commit", "--allow-empty", "-m", "next");
  const descendantSha = git(repoPath, "rev-parse", "HEAD");
  git(repoPath, "checkout", "--orphan", "diverged");
  git(repoPath, "commit", "--allow-empty", "-m", "diverged");
  const divergentSha = git(repoPath, "rev-parse", "HEAD");
  return { baseSha, descendantSha, divergentSha, repoPath, rootSha };
}

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) rmSync(path, { force: true, recursive: true });
});

describe("assertReleasePinDescends", () => {
  test("accepts an unchanged pin and a descendant", () => {
    const { baseSha, descendantSha, repoPath } = fixture();
    expect(() => assertReleasePinDescends({ baseSha, proposedSha: baseSha, repoPath })).not.toThrow();
    expect(() => assertReleasePinDescends({ baseSha, proposedSha: descendantSha, repoPath })).not.toThrow();
  });

  test("rejects a valid but divergent or older history", () => {
    const { baseSha, divergentSha, repoPath, rootSha } = fixture();
    expect(() => assertReleasePinDescends({ baseSha, proposedSha: rootSha, repoPath }))
      .toThrow("silently roll the deployed API backwards");
    expect(() => assertReleasePinDescends({ baseSha, proposedSha: divergentSha, repoPath }))
      .toThrow("silently roll the deployed API backwards");
  });

  test("fails loudly when either commit is unavailable", () => {
    const { baseSha, repoPath } = fixture();
    const missingSha = "0".repeat(40);
    expect(() => assertReleasePinDescends({ baseSha, proposedSha: missingSha, repoPath }))
      .toThrow("unavailable in the fetched repository history");
    expect(() => assertReleasePinDescends({ baseSha: missingSha, proposedSha: baseSha, repoPath }))
      .toThrow("unavailable in the fetched repository history");
  });
});
