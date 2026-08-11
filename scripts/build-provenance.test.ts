import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  assertDistBuildProvenance,
  createBuildProvenance,
  inspectSourceState,
  parseBuildProvenance,
  writeBuildProvenance,
} from "./build-provenance";

const API_SHA = "2".repeat(40);
const CORE_SHA = "3".repeat(40);

function releaseId(webSha: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ apiSha: API_SHA, coreSha: CORE_SHA, webSha }))
    .digest("hex");
}

function fixtureRepo(): { root: string; webSha: string } {
  const root = mkdtempSync(resolve(tmpdir(), "web-build-provenance-"));
  mkdirSync(resolve(root, ".github", "release-refs"), { recursive: true });
  writeFileSync(resolve(root, ".github", "release-refs", "api.sha"), `${API_SHA}\n`);
  writeFileSync(resolve(root, ".github", "release-refs", "core.sha"), `${CORE_SHA}\n`);
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.email=operator@example.test", "-c", "user.name=operator", "commit", "--allow-empty", "-qm", "fixture"], { cwd: root });
  const webSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  return { root, webSha };
}

describe("web build provenance", () => {
  test("captures the full release triple during the build", () => {
    const fixture = fixtureRepo();
    const provenance = createBuildProvenance(fixture.root, {
      buildId: "build-fixture",
      builtAt: "2026-08-11T11:23:15.000Z",
    });

    expect(provenance).toMatchObject({
      schemaVersion: 2,
      buildId: "build-fixture",
      webSha: fixture.webSha,
      apiSha: API_SHA,
      coreSha: CORE_SHA,
      sourceState: "clean",
      hotfix: null,
    });
    expect(provenance.releaseId).toMatch(/^[0-9a-f]{64}$/);
  });

  test("rejects a stale dist stamp before deployment", () => {
    const webSha = "1".repeat(40);
    const staleWebSha = "9".repeat(40);
    const path = resolve(mkdtempSync(resolve(tmpdir(), "web-dist-provenance-")), "build-info.json");
    writeBuildProvenance(path, {
      schemaVersion: 2,
      releaseId: releaseId(staleWebSha),
      buildId: "stale-build",
      builtAt: "2026-08-11T11:23:15.000Z",
      webSha: staleWebSha,
      apiSha: API_SHA,
      coreSha: CORE_SHA,
      sourceState: "clean",
      hotfix: null,
    });

    expect(() => assertDistBuildProvenance({ webSha, apiSha: API_SHA, coreSha: CORE_SHA }, path))
      .toThrow(/webSha mismatch/);
  });

  test("rejects abbreviated SHAs in the artifact stamp", () => {
    expect(() => parseBuildProvenance(JSON.stringify({
      schemaVersion: 2,
      releaseId: "4".repeat(64),
      buildId: "bad-build",
      builtAt: "2026-08-11T11:23:15.000Z",
      webSha: "1234567",
      apiSha: API_SHA,
      coreSha: CORE_SHA,
      sourceState: "clean",
      hotfix: null,
    }))).toThrow(/webSha must contain one full lowercase commit SHA/);
  });

  test("content-addresses dirty tracked and untracked source", () => {
    const fixture = fixtureRepo();
    writeFileSync(resolve(fixture.root, "incident.txt"), "first state\n");
    const first = inspectSourceState(fixture.root, "Urgent repair");
    writeFileSync(resolve(fixture.root, "incident.txt"), "second state\n");
    const second = inspectSourceState(fixture.root, "Urgent repair");

    expect(first.sourceState).toBe("dirty");
    expect(first.hotfix?.reasonSlug).toBe("urgent-repair");
    expect(first.hotfix?.patchSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(second.hotfix?.patchSha256).not.toBe(first.hotfix?.patchSha256);
  });
});
