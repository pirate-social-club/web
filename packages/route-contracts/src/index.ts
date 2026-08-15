export type RouteSurface = "app" | "bare" | "api" | "seam";

export interface RouteContract {
  path: string;
  surface: RouteSurface;
  signedIn: boolean;
  readOnly: boolean;
}

/** Frozen route metadata; per-route migration entries are added by lane R. */
export const routeContracts = [
  { path: "/", surface: "app", signedIn: false, readOnly: true },
  { path: "/auth", surface: "bare", signedIn: false, readOnly: true },
  { path: "/api/health", surface: "api", signedIn: false, readOnly: true },
  { path: "/seam/host", surface: "seam", signedIn: false, readOnly: true },
] as const satisfies readonly RouteContract[];

export function routeContractFor(path: string): RouteContract | undefined {
  return routeContracts.find(route => route.path === path);
}
