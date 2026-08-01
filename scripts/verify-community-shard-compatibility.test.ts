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

  test("rejects malformed health payloads", () => {
    expect(() => validateShardCompatibility({ ok: true, environment: "production" }, EXPECTED))
      .toThrow("Shard attestation is not healthy");
    expect(() => validateShardCompatibility(null, EXPECTED))
      .toThrow("malformed JSON payload");
  });

  test("rejects an unreachable health endpoint", async () => {
    let attempts = 0;
    await expect(verifyShardCompatibility({
      apiDir: "/api",
      execFile: gitExec as never,
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
