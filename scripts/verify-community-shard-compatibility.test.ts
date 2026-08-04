import { describe, expect, test } from "bun:test";

import {
  deriveShardSourceVersion,
  validateShardCompatibility,
  verifyShardCompatibility,
} from "./verify-community-shard-compatibility.mjs";

const EXPECTED = "shard-tree.shared-tree";

function healthyPayload(sourceVersion = EXPECTED) {
  return {
    ok: true,
    environment: "production",
    expected_shard_source_version: EXPECTED,
    shard_attestation: { healthy: true, status: "verified" },
    shard_version: {
      build: { gitSha: "shard-git-sha", sourceVersion },
      workerVersion: { id: "worker-version-id", tag: "worker-version-tag" },
    },
  };
}

function gitExec(_command: string, args: string[]) {
  const revision = args.at(-1);
  if (revision === "HEAD:services/community-d1-shard") return "shard-tree\n";
  if (revision === "HEAD:services/shared") return "shared-tree\n";
  throw new Error(`unexpected git invocation: ${args.join(" ")}`);
}

describe("production community-shard compatibility preflight", () => {
  test("derives the expected source version from the pinned API trees", () => {
    expect(deriveShardSourceVersion("/api", gitExec as never)).toBe(EXPECTED);
  });

  test("accepts a healthy exact source-version match and captures diagnostics", async () => {
    const result = await verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      fetchImpl: async (url, init) => {
        expect(String(url)).toContain("release_shard_verify=");
        expect(init?.cache).toBe("no-store");
        return Response.json(healthyPayload(), { headers: { "cf-ray": "ray-id" } });
      },
    });

    expect(result).toMatchObject({
      actualSourceVersion: EXPECTED,
      cfRay: "ray-id",
      expectedSourceVersion: EXPECTED,
      shardGitSha: "shard-git-sha",
      workerVersionId: "worker-version-id",
      workerVersionTag: "worker-version-tag",
    });
  });

  test("rejects a source-version mismatch", () => {
    expect(() => validateShardCompatibility(healthyPayload("old-shard.old-shared"), EXPECTED))
      .toThrow(`Pinned API expects shard source version ${EXPECTED}`);
  });

  test("pre-deploy accepts only a coherent previous pair and requests a shard deploy", () => {
    const previous = "previous-shard.previous-shared";
    const payload = healthyPayload(previous);
    payload.expected_shard_source_version = previous;
    expect(validateShardCompatibility(payload, EXPECTED, { phase: "pre-deploy" })).toMatchObject({
      deployShard: true,
      previousSourceVersion: previous,
    });

    payload.expected_shard_source_version = "unrelated-source";
    expect(() => validateShardCompatibility(payload, EXPECTED, { phase: "pre-deploy" }))
      .toThrow("not a coherent previous pair");
  });

  test("pre-deploy resumes after the pinned shard propagated ahead of the API", async () => {
    const previous = "previous-shard.previous-shared";
    const result = await verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      phase: "pre-deploy",
      retryDelayMs: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => Response.json({
        ...healthyPayload(EXPECTED),
        ok: false,
        error_code: "d1_shard_version_mismatch",
        expected_shard_source_version: previous,
        shard_attestation: undefined,
      }, { status: 503 }),
    });

    expect(result).toMatchObject({
      actualSourceVersion: EXPECTED,
      deployShard: false,
      liveApiExpectedSourceVersion: previous,
    });
  });

  test("accepts only the explicit previous-to-pinned mismatch during transition", () => {
    const previous = "previous-shard.previous-shared";
    const payload = {
      ...healthyPayload(EXPECTED),
      ok: false,
      error_code: "d1_shard_version_mismatch",
      expected_shard_source_version: previous,
    };
    expect(validateShardCompatibility(payload, EXPECTED, {
      phase: "transition",
      previousSourceVersion: previous,
    }).actualSourceVersion).toBe(EXPECTED);

    payload.expected_shard_source_version = "older-than-previous";
    expect(() => validateShardCompatibility(payload, EXPECTED, {
      phase: "transition",
      previousSourceVersion: previous,
    })).toThrow("outside the bounded previous-to-pinned window");
  });

  test("transition verification retries until the bounded mismatch is observable", async () => {
    const previous = "previous-shard.previous-shared";
    let attempts = 0;
    const result = await verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      phase: "transition",
      previousSourceVersion: previous,
      retryDelayMs: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) {
          const old = "previous-shard.previous-shared";
          const payload = healthyPayload(old);
          payload.expected_shard_source_version = old;
          return Response.json(payload);
        }
        return Response.json({
          ...healthyPayload(EXPECTED),
          ok: false,
          error_code: "d1_shard_version_mismatch",
          expected_shard_source_version: previous,
        }, { status: 503 });
      },
    });
    expect(attempts).toBe(2);
    expect(result.actualSourceVersion).toBe(EXPECTED);
  });

  test("rejects an unhealthy attestation", () => {
    const payload = healthyPayload();
    payload.shard_attestation = { healthy: false, status: "mismatch" };
    expect(() => validateShardCompatibility(payload, EXPECTED)).toThrow("Shard attestation is not healthy");
  });

  test("rejects provisioning health that is not ok", () => {
    const payload = { ...healthyPayload(), ok: false };
    expect(() => validateShardCompatibility(payload, EXPECTED)).toThrow("Provisioning health is not ok");
  });

  test("rejects a response for the wrong environment", () => {
    const payload = { ...healthyPayload(), environment: "staging" };
    expect(() => validateShardCompatibility(payload, EXPECTED)).toThrow("not production");
  });

  test("accepts the explicitly selected staging environment", () => {
    const payload = { ...healthyPayload(), environment: "staging" };
    expect(validateShardCompatibility(payload, EXPECTED, { environment: "staging" }))
      .toMatchObject({ actualSourceVersion: EXPECTED });
  });

  test("rejects malformed health payloads", () => {
    expect(() => validateShardCompatibility({ ok: true, environment: "production" }, EXPECTED))
      .toThrow("missing shard_version.build.sourceVersion");
    expect(() => validateShardCompatibility(null, EXPECTED))
      .toThrow("malformed JSON payload");
  });

  test("rejects an unreachable health endpoint", async () => {
    let attempts = 0;
    await expect(verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      phase: "pre-deploy",
      retryDelayMs: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => {
        attempts += 1;
        throw new Error("network down");
      },
    })).rejects.toThrow("Unable to read production provisioning health");
    expect(attempts).toBe(2);
  });

  test("retries one server failure and then succeeds", async () => {
    let attempts = 0;
    const result = await verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      retryDelayMs: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => {
        attempts += 1;
        return attempts === 1
          ? new Response("unavailable", { status: 503 })
          : Response.json(healthyPayload());
      },
    });
    expect(attempts).toBe(2);
    expect(result.actualSourceVersion).toBe(EXPECTED);
  });
});

describe("shard transition propagation budget", () => {
  const PREVIOUS = "previous-shard.previous-shared";

  // Drives sleepImpl and nowImpl off one counter so elapsed time is exactly the
  // sum of the sleeps the implementation asked for — no wall clock involved.
  function fakeClock() {
    let nowMs = 0;
    return {
      nowImpl: () => nowMs,
      sleepImpl: async (delayMs: number) => {
        nowMs += delayMs;
      },
      elapsedMs: () => nowMs,
    };
  }

  function stillOnPrevious() {
    const payload = healthyPayload(PREVIOUS);
    payload.expected_shard_source_version = PREVIOUS;
    return Response.json(payload);
  }

  function convergedOnPinned() {
    return Response.json(healthyPayload(EXPECTED));
  }

  test("waits out a shard that has not propagated yet, well past the old 6-attempt cap", async () => {
    const clock = fakeClock();
    let attempts = 0;
    const result = await verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      phase: "transition",
      previousSourceVersion: PREVIOUS,
      retryDelayMs: 1_000,
      nowImpl: clock.nowImpl,
      sleepImpl: clock.sleepImpl,
      fetchImpl: async () => {
        attempts += 1;
        // The old budget was 6 attempts / ~6s; this lands past both.
        return attempts < 12 ? stillOnPrevious() : convergedOnPinned();
      },
    });

    expect(attempts).toBe(12);
    expect(result.actualSourceVersion).toBe(EXPECTED);
    expect(clock.elapsedMs()).toBeGreaterThan(6_000);
    expect(clock.elapsedMs()).toBeLessThanOrEqual(90_000);
  });

  test("backs off instead of hammering, and still bounds the wait at the budget", async () => {
    const clock = fakeClock();
    let attempts = 0;
    await expect(verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      phase: "transition",
      previousSourceVersion: PREVIOUS,
      retryDelayMs: 1_000,
      transitionBudgetMs: 90_000,
      nowImpl: clock.nowImpl,
      sleepImpl: clock.sleepImpl,
      fetchImpl: async () => {
        attempts += 1;
        return stillOnPrevious();
      },
    })).rejects.toThrow(/has not propagated yet/);

    // Exponential backoff capped at 5s: a 90s budget costs ~20 probes, not 90.
    expect(attempts).toBeLessThan(30);
    expect(clock.elapsedMs()).toBeGreaterThanOrEqual(90_000);
  });

  test("fails fast on an unexpected version instead of spending the budget", async () => {
    const clock = fakeClock();
    let attempts = 0;
    await expect(verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      phase: "transition",
      previousSourceVersion: PREVIOUS,
      retryDelayMs: 1_000,
      nowImpl: clock.nowImpl,
      sleepImpl: clock.sleepImpl,
      fetchImpl: async () => {
        attempts += 1;
        const payload = healthyPayload("some-unrelated-source.version");
        payload.expected_shard_source_version = "some-unrelated-source.version";
        return Response.json(payload);
      },
    })).rejects.toThrow(/outside the bounded previous-to-pinned window/);

    // Waiting cannot turn an unexpected version into the pinned one.
    expect(attempts).toBe(1);
    expect(clock.elapsedMs()).toBe(0);
  });

  test("waits out a transient 5xx after deploy, then enforces converged compatibility", async () => {
    const clock = fakeClock();
    let attempts = 0;
    const result = await verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
      phase: "converged",
      retryDelayMs: 1_000,
      nowImpl: clock.nowImpl,
      sleepImpl: clock.sleepImpl,
      fetchImpl: async () => {
        attempts += 1;
        return attempts < 12
          ? new Response("unavailable", { status: 503 })
          : convergedOnPinned();
      },
    });

    expect(attempts).toBe(12);
    expect(result.actualSourceVersion).toBe(EXPECTED);
    expect(clock.elapsedMs()).toBeGreaterThan(6_000);
    expect(clock.elapsedMs()).toBeLessThanOrEqual(90_000);
  });
});
