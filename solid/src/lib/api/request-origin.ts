import { getRequestEvent } from "@solidjs/web";
import { resolveApiOriginFromExecution } from "./origin";

function resolveExecutionEnvironment(): "local" | "staging" | "production" {
  if (import.meta.env?.DEV || import.meta.env?.MODE === "development" || import.meta.env?.MODE === "local") {
    return "local";
  }
  if (import.meta.env?.MODE === "staging") return "staging";
  return "production";
}

function resolveApiOriginForRequest(request?: Request): string {
  const eventOrigin = getRequestEvent()?.locals?.apiOrigin;
  if (eventOrigin) return eventOrigin;

  const hostname = request
    ? new URL(request.url).hostname
    : typeof window !== "undefined"
      ? window.location.hostname
      : "localhost";
  return resolveApiOriginFromExecution(hostname, resolveExecutionEnvironment());
}

export function resolveApiUrl(pathname: string, request?: Request): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, `${resolveApiOriginForRequest(request)}/`).toString();
}
