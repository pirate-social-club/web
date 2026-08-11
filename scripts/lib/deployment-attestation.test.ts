import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  parseVersionSha,
  validateMatchingReleaseAttestations,
  validateVersionPayload,
  versionShasMatch,
} from "./deployment-attestation.mjs";

function payload(overrides: Record<string, unknown> = {}) {
  const body = {
    service: "web",
    environment: "production",
    git_sha: "a".repeat(40),
    git_ref: "main",
    build_timestamp: "2026-08-11T11:23:15Z",
    build_id: "build-123",
    web_sha: "a".repeat(40),
    api_sha: "b".repeat(40),
    core_sha: "c".repeat(40),
    source_state: "clean",
    hotfix: null,
    ...overrides,
  };
  return {
    ...body,
    release_id: overrides.release_id ?? createHash("sha256").update(JSON.stringify({
      apiSha: body.api_sha,
      coreSha: body.core_sha,
      webSha: body.web_sha,
    })).digest("hex"),
  };
}

describe("deployment attestation policy", () => {
  test("accepts only exact lowercase full SHAs", () => {
    expect(parseVersionSha("a".repeat(40))).toEqual({
      sha: "a".repeat(40),
      suffix: null,
    });
    expect(parseVersionSha("abc1234")).toBeNull();
    expect(parseVersionSha(`${"a".repeat(40)}-hotfix-incident`)).toBeNull();
    expect(parseVersionSha("A".repeat(40))).toBeNull();
  });

  test("matches exact commit identity only", () => {
    expect(versionShasMatch("a".repeat(40), "a".repeat(40))).toBe(true);
    expect(versionShasMatch("a".repeat(40), "a".repeat(39))).toBe(false);
    expect(versionShasMatch("a".repeat(40), "A".repeat(40))).toBe(false);
    expect(versionShasMatch("a".repeat(40), `${"a".repeat(40)}-hotfix-incident`)).toBe(false);
  });

  test("validates required identity fields through one policy", () => {
    expect(validateVersionPayload(payload(), {
      service: "web",
      environment: "production",
      gitSha: "a".repeat(40),
    }).failures).toEqual([]);

    expect(validateVersionPayload(payload({ service: "api", git_sha: "string" }), {
      service: "web",
      environment: "production",
      gitSha: "a".repeat(40),
    }).failures).toEqual([
      "git_sha is a placeholder",
      "expected service=web, got api",
      "git_sha is malformed: string",
      "git_sha=string does not match api_sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      `expected git_sha=${"a".repeat(40)}, got string`,
    ]);
  });

  test("requires coherent clean and dirty source provenance", () => {
    expect(validateVersionPayload(payload({ source_state: "clean", hotfix: { reason_slug: "repair", patch_sha256: "f".repeat(64) } })).failures)
      .toContain("clean source_state requires hotfix=null");
    expect(validateVersionPayload(payload({ source_state: "dirty", hotfix: null })).failures)
      .toContain("dirty source_state requires hotfix metadata");
    expect(validateVersionPayload(payload({
      source_state: "dirty",
      hotfix: { reason_slug: "urgent-repair", patch_sha256: "f".repeat(64) },
    })).failures).toEqual([]);
  });

  test("rejects placeholders and release IDs detached from the tuple", () => {
    expect(validateVersionPayload(payload({ build_id: "string" })).failures)
      .toContain("build_id is a placeholder");
    expect(validateVersionPayload(payload({ release_id: "d".repeat(64) })).failures)
      .toContain("release_id does not match the attested release triple");
  });

  test("rejects endpoints that do not report one release tuple", () => {
    expect(validateMatchingReleaseAttestations([
      { label: "web", body: payload() },
      { label: "api", body: payload({ service: "api", git_sha: "b".repeat(40), build_id: "other-build" }) },
    ])).toEqual([
      "api build_id=other-build does not match web build_id=build-123",
    ]);
  });
});
