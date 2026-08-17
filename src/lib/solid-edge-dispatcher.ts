import {
  classifySolidHost,
  dispatchSolidRequest,
  sanitizeSolidResponse,
  type SolidDispatchResult,
  type SolidRouteAllowlist,
  type SolidService,
} from "../../packages/web-platform/src/index";

export type SolidEdgeEnv = {
  SOLID_ROUTE_ALLOWLIST?: SolidRouteAllowlist;
  SOLID?: SolidService;
  SOLID_ENV?: string;
  SOLID_STAGING_HOST?: string;
  SOLID_EDGE_HMAC_KEY?: string;
  SOLID_EDGE_MAX_CLOCK_SKEW_SECONDS?: string;
};

function forwardingMetadataPresent(request: Request): boolean {
  if (request.headers.get("x-pirate-hns-trusted-forwarder") !== "1") return false;
  return Boolean(
    request.headers.get("x-pirate-hns-community-id")?.trim()
      || request.headers.get("x-pirate-hns-community-route")?.trim(),
  );
}

export async function dispatchSolidRequestAtEdge(
  request: Request,
  effectiveUrl: string,
  env: SolidEdgeEnv,
): Promise<SolidDispatchResult> {
  const url = new URL(effectiveUrl);
  return dispatchSolidRequest({
    request,
    effectiveUrl,
    surface: classifySolidHost(url.hostname, env.SOLID_STAGING_HOST),
    forwardingMetadataPresent: forwardingMetadataPresent(request),
    seamEnabled: env.SOLID_ENV === "local" || env.SOLID_ENV === "development",
    routeAllowlist: env.SOLID_ROUTE_ALLOWLIST,
    solidService: env.SOLID,
    solidEdgeHmacKey: env.SOLID_EDGE_HMAC_KEY,
  });
}

/**
 * Apply the public response boundary to dispatcher-generated dispositions.
 * Solid responses are already sanitized by the package dispatcher; the
 * response-kind path is constructed locally and needs the same boundary
 * before the React Worker returns it to a client.
 */
export function sanitizeSolidDispatchResponse(result: SolidDispatchResult): SolidDispatchResult {
  if (result.kind !== "response") return result;
  return { ...result, response: sanitizeSolidResponse(result.response) };
}
