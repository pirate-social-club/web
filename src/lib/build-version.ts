export type BuildVersionEnv = {
  BUILD_GIT_REF?: string;
  BUILD_GIT_SHA?: string;
  BUILD_TIMESTAMP?: string;
  HNS_PUBLIC_API_ORIGIN?: string;
  HNS_PUBLIC_APP_ORIGIN?: string;
  NODE_ENV?: string;
};

export type BuildVersionService = "web" | "web-public";

export function buildVersionPayload(service: BuildVersionService, env: BuildVersionEnv = {}) {
  return {
    service,
    environment: env.NODE_ENV ?? null,
    git_sha: env.BUILD_GIT_SHA ?? null,
    git_ref: env.BUILD_GIT_REF ?? null,
    build_timestamp: env.BUILD_TIMESTAMP ?? null,
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
