export default {
  async fetch(request: Request, env: {
    SOLID_BUILD_SHA?: string;
    SOLID_BUILD_REF?: string;
    SOLID_ENV?: string;
  }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/__version") {
      return Response.json({
        service: "pirate-web-solid-public",
        environment: env.SOLID_ENV ?? null,
        git_sha: env.SOLID_BUILD_SHA ?? null,
        git_ref: env.SOLID_BUILD_REF ?? null,
      }, { headers: { "cache-control": "no-store" } });
    }
    return Response.json({
      worker: "pirate-web-solid-public",
      path: url.pathname,
    });
  },
};
