import {
  routeContractFor,
  routeIdFor,
  type RouteContract,
  type SolidRouteId,
} from "../../route-contracts/src/index";
import {
  resolveSolidRequestDisposition,
  SOLID_UPSTREAM_TIMEOUT_MS,
  type SolidRequestDisposition,
} from "./perimeter";
import {
  sanitizeSolidResponse,
  signSolidEdgeRequest,
} from "./solid-edge-auth";
import type { HostSurface } from "./hns";

export const SOLID_ROUTE_ALLOWLIST_VERSION = 1 as const;

export interface SolidRouteAllowlist {
  get(key: string, type?: "text"): Promise<string | null>;
}

export interface SolidService {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface SolidRouteAllowlistRecord {
  version: typeof SOLID_ROUTE_ALLOWLIST_VERSION;
  path: string;
  enabled: boolean;
  releaseId: string;
}

export type SolidAllowlistValidation =
  | { ok: true; record: SolidRouteAllowlistRecord }
  | { ok: false; reason: "malformed" | "disabled" | "path-mismatch" };

export type SolidDispatchFallbackReason =
  | "route-not-dispatchable"
  | "unsupported-method"
  | "solid-capability-missing"
  | "unknown-host"
  | "forwarding-metadata-required"
  | "seam-disabled"
  | "allowlist-missing"
  | "allowlist-error"
  | "allowlist-timeout"
  | "allowlist-aborted"
  | "allowlist-record-missing"
  | "allowlist-record-disabled"
  | "allowlist-record-malformed"
  | "allowlist-record-path-mismatch"
  | "solid-service-missing"
  | "solid-edge-auth-unconfigured"
  | "solid-edge-auth-error"
  | "solid-service-error"
  | "solid-service-timeout"
  | "solid-service-aborted";

type SolidDispositionReason =
  | "unknown-host"
  | "forwarding-metadata-required"
  | "seam-disabled"
  | "sovereign-redirect";

export type SolidDispatchResult =
  | { kind: "react"; reason: SolidDispatchFallbackReason }
  | { kind: "response"; response: Response; reason: SolidDispositionReason }
  | { kind: "solid"; response: Response; routeId: SolidRouteId; releaseId: string };

export type SolidDispatchPreflight =
  | { kind: "react"; reason: SolidDispatchFallbackReason }
  | { kind: "response"; response: Response; reason: SolidDispositionReason }
  | { kind: "dispatch"; routeId: SolidRouteId; route: RouteContract };

export interface SolidDispatchInput {
  request: Request;
  effectiveUrl: string;
  surface: HostSurface;
  forwardingMetadataPresent: boolean;
  seamEnabled: boolean;
  routeAllowlist?: SolidRouteAllowlist;
  solidService?: SolidService;
  /** Secret shared only by the React Worker and its private Solid service binding. */
  solidEdgeHmacKey?: string;
  /** Internal test seam; production callers use the audited 4-second default. */
  timeoutMs?: number;
}

export interface SolidDispatchPreflightInput {
  pathname: string;
  method: string;
  surface: HostSurface;
  forwardingMetadataPresent: boolean;
  seamEnabled: boolean;
  capabilitiesAvailable: boolean;
  effectiveUrl?: string;
}

/**
 * Validate the complete versioned KV record at the edge. The route key is not
 * trusted: the value must repeat the exact path so a stale or mis-keyed write
 * cannot enable a different endpoint.
 */
export function validateSolidRouteAllowlistRecord(
  raw: string,
  expectedPath: string,
): SolidAllowlistValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "malformed" };
  }

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "enabled,path,releaseId,version") {
    return { ok: false, reason: "malformed" };
  }
  if (
    record.version !== SOLID_ROUTE_ALLOWLIST_VERSION
    || typeof record.path !== "string"
    || typeof record.enabled !== "boolean"
    || typeof record.releaseId !== "string"
    || record.releaseId.trim().length === 0
    || record.releaseId !== record.releaseId.trim()
    || record.releaseId.length > 256
  ) {
    return { ok: false, reason: "malformed" };
  }
  if (record.path !== expectedPath) {
    return { ok: false, reason: "path-mismatch" };
  }
  if (!record.enabled) {
    return { ok: false, reason: "disabled" };
  }

  return {
    ok: true,
    record: {
      version: SOLID_ROUTE_ALLOWLIST_VERSION,
      path: record.path,
      enabled: true,
      releaseId: record.releaseId,
    },
  };
}

function dispositionResponse(
  disposition: Exclude<SolidRequestDisposition, { kind: "render" }>,
  effectiveUrl: string,
): { response: Response; reason: SolidDispositionReason } {
  if (disposition.kind === "redirect") {
    const target = new URL(effectiveUrl);
    const hostname = target.hostname.toLowerCase();
    if (!hostname.startsWith("app.")) {
      target.hostname = `app.${hostname}`;
    }
    return {
      response: Response.redirect(target.toString(), disposition.status),
      reason: "sovereign-redirect",
    };
  }

  return {
    response: new Response("Not found", {
      status: disposition.status,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
        "x-solid-route-outcome": disposition.reason,
      },
    }),
    reason: disposition.reason,
  };
}

/**
 * Pure ordering gate. It performs no KV, service-binding, or upstream I/O.
 * Host and sovereign disposition are settled before the asynchronous toggle
 * lookup, and route contract eligibility is checked before dispatch.
 */
export function resolveSolidDispatchPreflight(
  input: SolidDispatchPreflightInput,
): SolidDispatchPreflight {
  const routeId = routeIdFor(input.pathname);
  const route = routeContractFor(input.pathname);
  if (!routeId || !route || route.signedIn || !route.readOnly || !["migrating", "solid"].includes(route.migration)) {
    return { kind: "react", reason: "route-not-dispatchable" };
  }

  const disposition = resolveSolidRequestDisposition({
    pathname: input.pathname,
    surface: input.surface,
    forwardingMetadataPresent: input.forwardingMetadataPresent,
    seamEnabled: input.seamEnabled,
  });

  // Missing optional bindings preserve the existing React Worker behavior,
  // including for requests that would otherwise fail the Solid perimeter.
  if (!input.capabilitiesAvailable) {
    return { kind: "react", reason: "solid-capability-missing" };
  }

  if (disposition.kind !== "render") {
    const result = dispositionResponse(disposition, input.effectiveUrl ?? `https://${input.surface}${input.pathname}`);
    return { kind: "response", response: result.response, reason: result.reason };
  }

  if (input.method.toUpperCase() !== "GET") {
    return { kind: "react", reason: "unsupported-method" };
  }

  return { kind: "dispatch", routeId, route };
}

const SENSITIVE_HEADERS = [
  "authorization",
  "cookie",
  "cf-access-jwt-assertion",
  "x-authenticated-user",
  "x-authenticated-user-id",
  "x-forwarded-user",
  "x-pirate-anonymous-id",
  "x-pirate-identity",
  "x-pirate-session-id",
  "x-pirate-session",
  "x-pirate-user-id",
  "x-session-id",
  "x-user-id",
] as const;

export function buildSolidServiceRequest(
  request: Request,
  effectiveUrl: string,
  signal: AbortSignal = request.signal,
): Request {
  const headers = new Headers(request.headers);
  for (const header of SENSITIVE_HEADERS) {
    headers.delete(header);
  }
  // Service bindings use the effective URL as the authenticated routing
  // target. Do not let a stale outer Host header disagree with that URL,
  // especially for an HNS request whose effective host was forwarded.
  headers.set("host", new URL(effectiveUrl).host);

  const init: RequestInit = {
    headers,
    method: request.method,
    redirect: "manual",
    signal,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }
  return new Request(effectiveUrl, init);
}

class SolidDispatchTimeoutError extends Error {
  constructor() {
    super("Solid dispatch operation timed out");
    this.name = "SolidDispatchTimeoutError";
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.name === "AbortError";
}

/**
 * Bound a binding operation even when the implementation ignores AbortSignal.
 * The race installs rejection handlers on the operation immediately, so an
 * operation that rejects after the timeout cannot become an unhandled promise.
 */
async function awaitSolidOperation<T>(input: {
  operation: (signal: AbortSignal) => Promise<T>;
  callerSignal?: AbortSignal;
  timeoutMs: number;
}): Promise<T> {
  if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1) {
    throw new RangeError("Solid dispatch timeout must be a positive integer");
  }
  // Do not even schedule the binding operation for an already-cancelled
  // request. This guard also avoids creating a timer or abort listener.
  if (input.callerSignal?.aborted) {
    throw new DOMException("The operation was aborted", "AbortError");
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let callerAbortListener: (() => void) | null = null;
  let callerAbort: Promise<never> | null = null;

  if (input.callerSignal) {
    callerAbort = new Promise<never>((_, reject) => {
      callerAbortListener = () => {
        controller.abort();
        reject(new DOMException("The operation was aborted", "AbortError"));
      };
      if (input.callerSignal!.aborted) callerAbortListener();
      else input.callerSignal!.addEventListener("abort", callerAbortListener, { once: true });
    });
  }

  const operation = Promise.resolve().then(() => {
    if (controller.signal.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    return input.operation(controller.signal);
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new SolidDispatchTimeoutError());
    }, input.timeoutMs);
  });

  try {
    return await Promise.race(
      callerAbort ? [operation, timeoutPromise, callerAbort] : [operation, timeoutPromise],
    );
  } finally {
    if (timeout !== null) clearTimeout(timeout);
    if (callerAbortListener && input.callerSignal) {
      input.callerSignal.removeEventListener("abort", callerAbortListener);
    }
  }
}

function fallbackFromValidation(
  reason: Extract<SolidAllowlistValidation, { ok: false }>["reason"],
): SolidDispatchFallbackReason {
  switch (reason) {
    case "disabled":
      return "allowlist-record-disabled";
    case "path-mismatch":
      return "allowlist-record-path-mismatch";
    case "malformed":
      return "allowlist-record-malformed";
  }
}

/**
 * Execute one dispatch attempt. KV remains an intentionally uncached,
 * eventually-consistent routine toggle. Emergency rollback belongs to Worker
 * version rollback, not to this request path.
 */
export async function dispatchSolidRequest(input: SolidDispatchInput): Promise<SolidDispatchResult> {
  const url = new URL(input.effectiveUrl);
  const timeoutMs = input.timeoutMs ?? SOLID_UPSTREAM_TIMEOUT_MS;
  const hasAllowlist = typeof input.routeAllowlist?.get === "function";
  const hasService = typeof input.solidService?.fetch === "function";
  const preflight = resolveSolidDispatchPreflight({
    pathname: url.pathname,
    method: input.request.method,
    surface: input.surface,
    forwardingMetadataPresent: input.forwardingMetadataPresent,
    seamEnabled: input.seamEnabled,
    capabilitiesAvailable: hasAllowlist && hasService,
    effectiveUrl: input.effectiveUrl,
  });
  if (preflight.kind !== "dispatch") {
    return preflight;
  }
  // The request may have been cancelled after pure disposition but before
  // this asynchronous boundary. Do not perform even the routine KV read.
  if (input.request.signal.aborted) {
    return { kind: "react", reason: "allowlist-aborted" };
  }

  let raw: string | null;
  try {
    raw = await awaitSolidOperation({
      callerSignal: input.request.signal,
      operation: () => input.routeAllowlist!.get(preflight.routeId, "text"),
      timeoutMs,
    });
  } catch (error) {
    if (error instanceof SolidDispatchTimeoutError) {
      return { kind: "react", reason: "allowlist-timeout" };
    }
    if (isAbortError(error)) {
      return { kind: "react", reason: "allowlist-aborted" };
    }
    return { kind: "react", reason: "allowlist-error" };
  }
  if (raw === null) {
    return { kind: "react", reason: "allowlist-record-missing" };
  }

  const validation = validateSolidRouteAllowlistRecord(raw, preflight.route.path);
  if (!validation.ok) {
    return { kind: "react", reason: fallbackFromValidation(validation.reason) };
  }

  let response: Response;
  try {
    if (!input.solidEdgeHmacKey?.trim()) {
      return { kind: "react", reason: "solid-edge-auth-unconfigured" };
    }
    response = await awaitSolidOperation({
      callerSignal: input.request.signal,
      operation: async signal => {
        const unsignedRequest = buildSolidServiceRequest(input.request, input.effectiveUrl, signal);
        const signedRequest = await signSolidEdgeRequest({
          request: unsignedRequest,
          key: input.solidEdgeHmacKey!,
        });
        return input.solidService!.fetch(new Request(signedRequest, { signal }));
      },
      timeoutMs,
    });
  } catch (error) {
    if (error instanceof SolidDispatchTimeoutError) {
      return { kind: "react", reason: "solid-service-timeout" };
    }
    if (isAbortError(error)) {
      return { kind: "react", reason: "solid-service-aborted" };
    }
    if (error instanceof Error && (
      error.message === "Solid edge HMAC key is not configured"
      || error.message === "Solid edge request body is too large to sign"
    )) {
      return { kind: "react", reason: "solid-edge-auth-unconfigured" };
    }
    // Any other failure came from the service binding itself. Keep the
    // existing failover classification; the signer only emits the explicit
    // configuration/body errors handled above.
    return { kind: "react", reason: "solid-service-error" };
  }

  // A real Solid 5xx is still the response. Falling through to React here
  // would issue a duplicate upstream request and hide the failed release.
  return {
    kind: "solid",
    response: sanitizeSolidResponse(response),
    routeId: preflight.routeId,
    releaseId: validation.record.releaseId,
  };
}
