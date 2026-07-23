#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function git(repoPath, args) {
  return spawnSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function requireCommit(repoPath, sha, label) {
  const result = git(repoPath, ["cat-file", "-e", `${sha}^{commit}`]);
  if (result.status !== 0) {
    throw new Error(
      `${label} API commit ${sha} is unavailable in the fetched repository history. `
      + "Refusing to treat missing ancestry as safe.",
    );
  }
}

export function assertReleasePinDescends({ baseSha, proposedSha, repoPath }) {
  requireCommit(repoPath, baseSha, "Current base pin");
  requireCommit(repoPath, proposedSha, "Proposed pin");

  const ancestry = git(repoPath, ["merge-base", "--is-ancestor", baseSha, proposedSha]);
  if (ancestry.status === 0) return;
  if (ancestry.status === 1) {
    throw new Error(
      `Proposed API pin ${proposedSha} is not a descendant of current base pin ${baseSha}. `
      + "This would silently roll the deployed API backwards. "
      + "Use the release-pin-rollback-approved PR label only for an intentional rollback.",
    );
  }
  throw new Error(`Unable to verify API pin ancestry: ${ancestry.stderr.trim() || "git merge-base failed"}`);
}

function option(args, name) {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`Missing required ${name} value`);
  return value;
}

function main() {
  const args = process.argv.slice(2);
  assertReleasePinDescends({
    baseSha: option(args, "--base"),
    proposedSha: option(args, "--proposed"),
    repoPath: option(args, "--repo"),
  });
  console.log("API release pin ancestry is monotonic.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
