import type { AppRoute } from "@/app/router";

function replaceTrailingSurface(path: string, from: "threads" | "videos", to: "threads" | "videos"): string | null {
  const suffix = `/${from}`;
  return path.endsWith(suffix) ? `${path.slice(0, -suffix.length)}/${to}` : null;
}

/**
 * SSR-visible counterpart to the hydrated surface navigation. Production
 * probes consume it to verify that every activated community has reciprocal
 * routes without downloading a browser in the release lane.
 */
export function resolveSurfaceNavigationHref(route: AppRoute): string | undefined {
  if (
    (route.kind === "community" || route.kind === "community-videos")
    && route.isImportedRoot
    && route.importedRootHostname
    && route.path === "/"
  ) {
    return route.kind === "community"
      ? `https://app.${route.importedRootHostname}/`
      : `https://${route.importedRootHostname}/`;
  }

  if (route.kind === "community") {
    return replaceTrailingSurface(route.path, "threads", "videos") ?? undefined;
  }
  if (route.kind === "community-videos") {
    return replaceTrailingSurface(route.path, "videos", "threads") ?? undefined;
  }
  return undefined;
}
