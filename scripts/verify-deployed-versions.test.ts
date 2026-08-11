import { describe, expect, test } from "bun:test";

import { verifyDeployedVersions, VersionMismatchError } from "./verify-deployed-versions.mjs";

const TARGET = {
  expectedSha: "abc1234def",
  url: "https://example.test/__version",
  service: "web",
  environment: "production",
};

function okResponse(sha: string, overrides: Record<string, unknown> = {}) {
  const webSha = sha === "abc1234deff00d"
    ? sha.padEnd(40, "0")
    : "abc1234" + "0".repeat(33);
  return {
    ok: true,
    json: async () => ({
      service: "web",
      environment: "production",
      git_sha: sha,
      git_ref: "main",
      build_timestamp: "2026-08-11T11:23:15Z",
      release_id: "d".repeat(64),
      build_id: "build-123",
      web_sha: webSha,
      api_sha: "b".repeat(40),
      core_sha: "c".repeat(40),
      ...overrides,
    }),
  };
}

describe("verifyDeployedVersions retry policy", () => {
  test("passes when the deployed SHA matches", async () => {
    let calls = 0;
    await verifyDeployedVersions([TARGET], {
      fetchImpl: async () => { calls += 1; return okResponse("abc1234deff00d"); },
    });
    expect(calls).toBe(1);
  });

  // The bug this file exists for: a transport failure says NOTHING about what is
  // deployed. Failing a release on one of them blocked production on 2026-07-22.
  test("retries a transport failure even when failFastOnMismatch is set", async () => {
    let calls = 0;
    await verifyDeployedVersions([TARGET], {
      attempts: 3,
      delayMs: 0,
      failFastOnMismatch: true,
      fetchImpl: async () => {
        calls += 1;
        if (calls < 3) throw new TypeError("fetch failed");
        return okResponse("abc1234deff00d");
      },
    });
    expect(calls).toBe(3);
  });

  test("retries a 5xx even when failFastOnMismatch is set", async () => {
    let calls = 0;
    await verifyDeployedVersions([TARGET], {
      attempts: 2,
      delayMs: 0,
      failFastOnMismatch: true,
      fetchImpl: async () => {
        calls += 1;
        return calls < 2 ? { ok: false, status: 503 } : okResponse("abc1234deff00d");
      },
    });
    expect(calls).toBe(2);
  });

  // A mismatch is a fact about what is deployed. Retrying cannot change it, so a
  // caller asking "was this replaced mid-gate?" must stop on the first answer.
  test("stops immediately on a mismatch when failFastOnMismatch is set", async () => {
    let calls = 0;
    await expect(verifyDeployedVersions([TARGET], {
      attempts: 5,
      delayMs: 0,
      failFastOnMismatch: true,
      fetchImpl: async () => { calls += 1; return okResponse("9999999other"); },
    })).rejects.toThrow(/expected git_sha=abc1234def/u);
    expect(calls).toBe(1);
  });

  // Post-DEPLOY callers want the opposite: a mismatch there usually means "not
  // propagated yet", so it should keep retrying.
  test("retries a mismatch when failFastOnMismatch is not set", async () => {
    let calls = 0;
    await verifyDeployedVersions([TARGET], {
      attempts: 3,
      delayMs: 0,
      fetchImpl: async () => {
        calls += 1;
        return calls < 3 ? okResponse("9999999other") : okResponse("abc1234deff00d");
      },
    });
    expect(calls).toBe(3);
  });

  test("exhausting attempts on transport failure still fails", async () => {
    await expect(verifyDeployedVersions([TARGET], {
      attempts: 2,
      delayMs: 0,
      failFastOnMismatch: true,
      fetchImpl: async () => { throw new TypeError("fetch failed"); },
    })).rejects.toThrow(/fetch failed/u);
  });

  test("classifies a mismatch as VersionMismatchError, not a generic Error", async () => {
    let captured: unknown;
    await verifyDeployedVersions([TARGET], {
      attempts: 1,
      delayMs: 0,
      fetchImpl: async () => okResponse("9999999other"),
    }).catch((error: unknown) => { captured = error; });
    expect(captured).toBeInstanceOf(Error);
    expect(new VersionMismatchError("x")).toBeInstanceOf(VersionMismatchError);
  });

  test("classifies an invalid payload as a mismatch", async () => {
    let calls = 0;
    await expect(verifyDeployedVersions([TARGET], {
      attempts: 3,
      delayMs: 0,
      failFastOnMismatch: true,
      fetchImpl: async () => {
        calls += 1;
        return { ok: true, json: async () => ({ git_sha: "abc1234def" }) };
      },
    })).rejects.toThrow(/service is missing/u);
    expect(calls).toBe(1);
  });

  test("rejects individually valid endpoints from different builds", async () => {
    const apiTarget = {
      expectedSha: "b".repeat(40),
      url: "https://api.example.test/__version",
      service: "api",
      environment: "production",
    };
    await expect(verifyDeployedVersions([TARGET, apiTarget], {
      attempts: 1,
      delayMs: 0,
      failFastOnMismatch: true,
      fetchImpl: async (url: URL) => String(url).includes("api.example.test")
        ? okResponse("b".repeat(40), { service: "api", build_id: "other-build" })
        : okResponse("abc1234deff00d"),
    })).rejects.toThrow(/build_id=other-build/u);
  });
});
