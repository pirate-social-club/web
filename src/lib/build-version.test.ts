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
    })).toMatchObject({
      service: "web",
      environment: "staging",
      git_sha: "abc123",
      git_ref: "main",
      build_timestamp: "2026-05-13T00:00:00Z",
    });
  });

  test("prevents caches from serving stale deployment metadata", () => {
    const response = buildVersionResponse("web", {
      BUILD_GIT_SHA: "abc123",
      DEPLOY_ENV: "production",
    });

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
  });

  test("surfaces provenance embedded by the build", () => {
    const payload = buildVersionPayload("web", {});

    expect(payload.artifact_git_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(payload.build_id.length).toBeGreaterThan(0);
  });
});
