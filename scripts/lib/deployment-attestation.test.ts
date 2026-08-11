import { describe, expect, test } from "bun:test";

import {
  parseVersionSha,
  validateVersionPayload,
  versionShasMatch,
} from "./deployment-attestation.mjs";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    service: "web",
    environment: "production",
    git_sha: "abc1234",
    git_ref: "main",
    build_timestamp: "2026-08-11T11:23:15Z",
    ...overrides,
  };
}

describe("deployment attestation policy", () => {
  test("parses the intentional hotfix suffix separately from the commit prefix", () => {
    expect(parseVersionSha("abc1234-hotfix-incident")).toEqual({
      sha: "abc1234",
      suffix: "-hotfix-incident",
    });
  });

  test("preserves bidirectional legacy prefix matching", () => {
    expect(versionShasMatch("abc1234def5678", "abc1234")).toBe(true);
    expect(versionShasMatch("abc1234", "abc1234def5678")).toBe(true);
    expect(versionShasMatch("abc1234-hotfix-incident", "abc1234def5678")).toBe(true);
    expect(versionShasMatch("abc123", "abc1234")).toBe(false);
  });

  test("validates required identity fields through one policy", () => {
    expect(validateVersionPayload(payload(), {
      service: "web",
      environment: "production",
      gitSha: "abc1234def5678",
    }).failures).toEqual([]);

    expect(validateVersionPayload(payload({ service: "api", git_sha: "string" }), {
      service: "web",
      environment: "production",
      gitSha: "abc1234def5678",
    }).failures).toEqual([
      "expected service=web, got api",
      "git_sha is malformed: string",
      "expected git_sha=abc1234def5678, got string",
    ]);
  });
});
