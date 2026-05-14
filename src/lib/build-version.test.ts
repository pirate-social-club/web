import { describe, expect, test } from "bun:test";

import { buildVersionPayload } from "./build-version";

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
});
