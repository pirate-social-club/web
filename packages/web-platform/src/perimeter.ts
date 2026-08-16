import { classifyHost, hostName, type HostSurface } from "./hns";

export const SOLID_UPSTREAM_TIMEOUT_MS = 4_000;

/** Accept one explicitly configured isolated staging host without broadening public host matching. */
export function classifySolidHost(host: string, configuredStagingHost?: string): HostSurface {
  const surface = classifyHost(host);
  if (surface !== "unknown") return surface;
  const normalizedHost = hostName(host);
  const normalizedStagingHost = hostName(configuredStagingHost ?? "");
  return normalizedHost && normalizedHost === normalizedStagingHost ? "canonical" : "unknown";
}

export type SolidRequestDisposition =
  | { kind: "render" }
  | { kind: "redirect"; status: 307 }
  | { kind: "reject"; status: 404; reason: "unknown-host" | "forwarding-metadata-required" | "seam-disabled" };

export function resolveSolidRequestDisposition(input: {
  pathname: string;
  surface: HostSurface;
  forwardingMetadataPresent: boolean;
  seamEnabled: boolean;
}): SolidRequestDisposition {
  if (input.surface === "unknown") {
    return { kind: "reject", status: 404, reason: "unknown-host" };
  }
  if (isSeamPath(input.pathname) && !input.seamEnabled) {
    return { kind: "reject", status: 404, reason: "seam-disabled" };
  }
  if (input.surface === "sovereign-apex" && input.pathname === "/") {
    return { kind: "redirect", status: 307 };
  }
  if (input.surface === "sovereign-apex" && !input.forwardingMetadataPresent) {
    return { kind: "reject", status: 404, reason: "forwarding-metadata-required" };
  }
  return { kind: "render" };
}

export function isSeamPath(pathname: string): boolean {
  return pathname === "/seam" || pathname.startsWith("/seam/");
}

export async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs = SOLID_UPSTREAM_TIMEOUT_MS,
): Promise<Response> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("upstream timeout must be a positive integer");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const callerSignal = init?.signal;
  const abortFromCaller = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
