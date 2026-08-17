// Thin Worker adapter: Solid start mode provides the web-standard handler;
// Cloudflare owns the Worker environment and the ASSETS binding.
import { handleRequest } from "virtual:solid-ssr-handler";
import {
  authenticateHnsForwarderRequest,
  classifySolidHost,
  fetchWithTimeout,
  SOLID_UPSTREAM_TIMEOUT_MS,
  verifySolidEdgeRequest,
} from "@pirate/web-platform";

type SolidWorkerEnv = {
  ASSETS?: Fetcher;
  HNS_FORWARDER_TRUSTED_IPS?: string;
  HNS_FORWARDER_HMAC_KEY?: string;
  HNS_FORWARDER_HMAC_PREVIOUS_KEY?: string;
  HNS_FORWARDER_MAX_CLOCK_SKEW_SECONDS?: string;
  HNS_FORWARDER_AUTH_TOKEN?: string;
  SOLID_BUILD_SHA?: string;
  SOLID_BUILD_REF?: string;
  SOLID_ENV?: string;
  SOLID_STAGING_HOST?: string;
  SOLID_EDGE_HMAC_KEY?: string;
  SOLID_EDGE_MAX_CLOCK_SKEW_SECONDS?: string;
};

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function versionResponse(env: SolidWorkerEnv): Response {
  return Response.json({
    service: "pirate-web-solid",
    environment: env.SOLID_ENV ?? null,
    git_sha: env.SOLID_BUILD_SHA ?? null,
    git_ref: env.SOLID_BUILD_REF ?? null,
  }, { headers: { "cache-control": "no-store" } });
}

export default {
  async fetch(request: Request, env: SolidWorkerEnv): Promise<Response> {
    // This Worker is private behind the React service binding. Verify the
    // binding signature before host routing, HNS handling, SSR, assets, or
    // version work. Invalid/missing/stale requests fail closed with no app or
    // upstream I/O and the shared key never enters the forwarded request.
    const edgeAuthentication = await verifySolidEdgeRequest({ request, ...env });
    if (!edgeAuthentication.ok) return notFound();
    request = edgeAuthentication.request;

    if (classifySolidHost(
      request.headers.get("host") ?? new URL(request.url).hostname,
      env.SOLID_STAGING_HOST,
    ) === "unknown") {
      return notFound();
    }

    const pathname = new URL(request.url).pathname;
    const assetRequest = pathname === "/favicon.ico" || pathname.startsWith("/_solid/assets/");
    if (pathname === "/__version" || assetRequest) {
      const forwarding = await authenticateHnsForwarderRequest(request, env);
      if (forwarding.rejection) {
        return new Response(
          forwarding.rejection === "configuration"
            ? "HNS forwarder authentication is not configured."
            : "HNS forwarder authentication failed.",
          {
            status: forwarding.rejection === "configuration" ? 503 : 403,
            headers: {
              "cache-control": "no-store",
              "content-type": "text/plain; charset=utf-8",
            },
          },
        );
      }
      request = forwarding.request;
    }

    if (pathname === "/__version") return versionResponse(env);
    if (assetRequest && env.ASSETS) {
      const assetUrl = new URL(request.url);
      if (assetUrl.pathname.startsWith("/_solid/assets/")) {
        assetUrl.pathname = assetUrl.pathname.slice("/_solid".length);
        request = new Request(assetUrl, request);
      }
      return fetchWithTimeout(
        (input, init) => env.ASSETS!.fetch(input, init),
        request,
        undefined,
        SOLID_UPSTREAM_TIMEOUT_MS,
      );
    }
    return handleRequest(request);
  },
};
