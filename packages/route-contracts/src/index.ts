export type RouteSurface = "app" | "bare" | "api" | "seam";
export type RouteMigration = "react" | "migrating" | "solid";

export interface RouteContract {
  path: string;
  surface: RouteSurface;
  signedIn: boolean;
  readOnly: boolean;
  migration: RouteMigration;
}

/** Frozen route metadata; per-route migration entries are added by lane R. */
export const routeContracts = [
  { path: "/", surface: "app", signedIn: false, readOnly: true, migration: "react" },
  { path: "/auth", surface: "bare", signedIn: false, readOnly: true, migration: "react" },
  { path: "/api/health", surface: "api", signedIn: false, readOnly: true, migration: "react" },
  { path: "/seam/host", surface: "seam", signedIn: false, readOnly: true, migration: "react" },
  { path: "/privacy", surface: "bare", signedIn: false, readOnly: true, migration: "migrating" },
  { path: "/robots.txt", surface: "api", signedIn: false, readOnly: true, migration: "migrating" },
] as const satisfies readonly RouteContract[];

export function routeContractFor(path: string): RouteContract | undefined {
  return routeContracts.find(route => route.path === path);
}
