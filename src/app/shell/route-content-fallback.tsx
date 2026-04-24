import type { AppRoute } from "@/app/router";
import { RouteLoadingState } from "@/app/route-loading-states";

export function RouteContentFallback({ route }: { route?: AppRoute }) {
  return <RouteLoadingState route={route} />;
}
