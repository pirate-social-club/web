export type RouteSurface = "app" | "bare" | "api" | "seam";
export type RouteMigration = "react" | "migrating" | "solid";

export interface RouteContract {
  path: string;
  surface: RouteSurface;
  signedIn: boolean;
  readOnly: boolean;
  migration: RouteMigration;
}

export const SOLID_ROUTE_IDS = [
  "v1:/privacy",
  "v1:/robots.txt",
  "v1:/u/:handle",
] as const;
export type SolidRouteId = typeof SOLID_ROUTE_IDS[number];

/** Frozen route metadata; per-route migration entries are added by lane R. */
export const routeContracts = [
  { path: "/", surface: "app", signedIn: false, readOnly: true, migration: "react" },
  { path: "/auth", surface: "bare", signedIn: false, readOnly: true, migration: "react" },
  { path: "/api/health", surface: "api", signedIn: false, readOnly: true, migration: "react" },
  { path: "/seam/host", surface: "seam", signedIn: false, readOnly: true, migration: "react" },
  { path: "/privacy", surface: "bare", signedIn: false, readOnly: true, migration: "migrating" },
  { path: "/robots.txt", surface: "api", signedIn: false, readOnly: true, migration: "migrating" },
  { path: "/u/:handle", surface: "app", signedIn: false, readOnly: true, migration: "migrating" },
] as const satisfies readonly RouteContract[];

function safeDynamicSegment(segment: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return false;
  }
  return decoded.length > 0
    && decoded !== "."
    && decoded !== ".."
    && !/[\\/\u0000-\u001f\u007f]/u.test(decoded);
}

function routePathMatches(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  const patternSegments = pattern.split("/");
  const pathSegments = path.split("/");
  if (patternSegments.length !== pathSegments.length) return false;
  return patternSegments.every((segment, index) => {
    if (!segment.startsWith(":")) return segment === pathSegments[index];
    return segment.length > 1 && safeDynamicSegment(pathSegments[index] ?? "");
  });
}

export function routeContractFor(path: string): RouteContract | undefined {
  return routeContracts.find(route => routePathMatches(route.path, path));
}

/** Resolve the versioned edge key from the authoritative route inventory. */
export function routeIdFor(path: string): SolidRouteId | undefined {
  const route = routeContractFor(path);
  if (!route || !SOLID_ROUTE_IDS.includes(`v1:${route.path}` as SolidRouteId)) {
    return undefined;
  }
  return `v1:${route.path}` as SolidRouteId;
}

export function routeContractForId(routeId: string): RouteContract | undefined {
  if (!routeId.startsWith("v1:")) return undefined;
  return routeContractFor(routeId.slice("v1:".length));
}
