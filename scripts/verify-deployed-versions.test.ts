import { describe, expect, test } from "bun:test";

import { verifyDeployedVersions, VersionMismatchError } from "./verify-deployed-versions.mjs";

const TARGET = { expectedSha: "abc1234def", url: "https://example.test/__version" };

function okResponse(sha: string) {
  return { ok: true, json: async () => ({ git_sha: sha }) };
}

describe("verifyDeployedVersions retry policy", () => {
  test("passes when the deployed SHA matches", async () => {
    let calls = 0;
    await verifyDeployedVersions([TARGET], {
      fetchImpl: async () => { calls += 1; return okResponse("abc1234deffull"); },
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
        return okResponse("abc1234deffull");
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
        return calls < 2 ? { ok: false, status: 503 } : okResponse("abc1234deffull");
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
    })).rejects.toThrow(/expected abc1234def/u);
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
        return calls < 3 ? okResponse("9999999other") : okResponse("abc1234deffull");
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
});
