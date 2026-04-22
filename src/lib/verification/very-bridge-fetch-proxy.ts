import { resolveApiUrl } from "@/lib/api/base-url";
import { getAccessToken } from "@/lib/api/session-store";

const VERY_BRIDGE_ORIGIN = "https://bridge.very.org";
const VERY_BRIDGE_PATH_PREFIX = "/api/v1/";

function readFetchUrl(input: RequestInfo | URL): string | null {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return null;
}

export function resolveVeryBridgeProxyPath(inputUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return null;
  }

  if (url.origin !== VERY_BRIDGE_ORIGIN || !url.pathname.startsWith(VERY_BRIDGE_PATH_PREFIX)) {
    return null;
  }

  const bridgePath = url.pathname.slice(VERY_BRIDGE_PATH_PREFIX.length);
  if (bridgePath === "sessions") {
    return "/verification-sessions/very-bridge/sessions";
  }

  const sessionMatch = /^session\/([^/]+)$/u.exec(bridgePath);
  if (sessionMatch?.[1]) {
    return `/verification-sessions/very-bridge/session/${encodeURIComponent(decodeURIComponent(sessionMatch[1]))}`;
  }

  return null;
}

export function installVeryBridgeFetchProxy(): () => void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return () => {};
  }

  const originalFetch = window.fetch;
  const proxiedFetch: typeof window.fetch = async (input, init) => {
    const sourceUrl = readFetchUrl(input);
    const proxyPath = sourceUrl ? resolveVeryBridgeProxyPath(sourceUrl) : null;
    if (!sourceUrl || !proxyPath) {
      return originalFetch.call(window, input, init);
    }

    const sourceRequest = input instanceof Request
      ? new Request(input, init)
      : new Request(sourceUrl, init);
    const headers = new Headers();
    const contentType = sourceRequest.headers.get("content-type");
    const accept = sourceRequest.headers.get("accept");
    if (contentType) {
      headers.set("content-type", contentType);
    }
    if (accept) {
      headers.set("accept", accept);
    }
    const token = getAccessToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    const body = sourceRequest.method === "GET" || sourceRequest.method === "HEAD"
      ? undefined
      : await sourceRequest.clone().arrayBuffer();
    if (!headers.has("content-type") && body != null && body.byteLength > 0) {
      headers.set("content-type", "application/json");
    }

    return originalFetch.call(window, resolveApiUrl(proxyPath), {
      body,
      credentials: "omit",
      headers,
      method: sourceRequest.method,
      mode: "cors",
      redirect: sourceRequest.redirect,
      signal: sourceRequest.signal,
    });
  };

  window.fetch = proxiedFetch;
  return () => {
    if (window.fetch === proxiedFetch) {
      window.fetch = originalFetch;
    }
  };
}
