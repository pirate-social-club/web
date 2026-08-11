import buildInfo from "../../build-info.json" with { type: "json" };

export type BuildVersionEnv = {
  BUILD_GIT_REF?: string;
  BUILD_GIT_SHA?: string;
  BUILD_TIMESTAMP?: string;
  DEPLOY_ENV?: string;
  HNS_PUBLIC_API_ORIGIN?: string;
  HNS_PUBLIC_APP_ORIGIN?: string;
  NODE_ENV?: string;
};

export type BuildVersionService = "web" | "web-public";

export function buildVersionPayload(service: BuildVersionService, env: BuildVersionEnv = {}) {
  return {
    service,
    environment: env.DEPLOY_ENV ?? env.NODE_ENV ?? null,
    git_sha: env.BUILD_GIT_SHA ?? null,
    git_ref: env.BUILD_GIT_REF ?? null,
    build_timestamp: env.BUILD_TIMESTAMP ?? null,
    release_id: buildInfo.releaseId,
    build_id: buildInfo.buildId,
    web_sha: buildInfo.webSha,
    api_sha: buildInfo.apiSha,
    core_sha: buildInfo.coreSha,
    api_origin: env.HNS_PUBLIC_API_ORIGIN ?? null,
    app_origin: env.HNS_PUBLIC_APP_ORIGIN ?? null,
  };
}

export function buildVersionResponse(service: BuildVersionService, env: BuildVersionEnv = {}): Response {
  return new Response(JSON.stringify(buildVersionPayload(service, env), null, 2) + "\n", {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}
