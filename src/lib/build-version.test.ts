import { describe, expect, test } from "bun:test";

import { buildVersionPayload, buildVersionResponse } from "./build-version";

describe("buildVersionPayload", () => {
  test("prefers deploy environment over node environment", () => {
    expect(buildVersionPayload("web", {
      BUILD_GIT_REF: "main",
      BUILD_GIT_SHA: "abc123",
      BUILD_TIMESTAMP: "2026-05-13T00:00:00Z",
      DEPLOY_ENV: "staging",
      NODE_ENV: "production",
      CF_VERSION_METADATA: {
        id: "worker-version-id",
        tag: "worker-version-tag",
        timestamp: "2026-05-13T00:00:01Z",
      },
    })).toMatchObject({
      service: "web",
      environment: "staging",
      git_sha: "abc123",
      git_ref: "main",
      build_timestamp: "2026-05-13T00:00:00Z",
      worker_version: {
        id: "worker-version-id",
        tag: "worker-version-tag",
        timestamp: "2026-05-13T00:00:01Z",
      },
    });
  });

  test("reports null worker metadata outside a versioned Worker deployment", () => {
    expect(buildVersionPayload("web", {})).toMatchObject({ worker_version: null });
  });

  test("prevents caches from serving stale deployment metadata", () => {
    const response = buildVersionResponse("web", {
      BUILD_GIT_SHA: "abc123",
      DEPLOY_ENV: "production",
    });

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
  });
});
