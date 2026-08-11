import { describe, expect, test } from "bun:test";

import { buildVersionPayload, buildVersionResponse } from "./build-version";

describe("buildVersionPayload", () => {
  test("uses embedded artifact identity with the deploy environment", () => {
    expect(buildVersionPayload("web", {
      BUILD_GIT_REF: "main",
      BUILD_GIT_SHA: "abc123",
      BUILD_TIMESTAMP: "2026-05-13T00:00:00Z",
      DEPLOY_ENV: "staging",
      NODE_ENV: "production",
    })).toMatchObject({
      service: "web",
      environment: "staging",
      git_sha: expect.stringMatching(/^[0-9a-f]{40}$/),
      git_ref: "main",
      build_timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/u),
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

    expect(payload.release_id).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.build_id.length).toBeGreaterThan(0);
    expect(payload.web_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(payload.api_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(payload.core_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(payload.deploy_reason_slug === null || typeof payload.deploy_reason_slug === "string").toBe(true);
    expect(["clean", "dirty"]).toContain(payload.source_state);
    if (payload.source_state === "clean") expect(payload.hotfix).toBeNull();
    expect(payload.api_origin).toBeNull();
    expect(payload.app_origin).toBeNull();
  });
});
