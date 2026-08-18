import { RouteLoadingState } from "../../design-system";

import { cn } from "../../design-system";
import type { ShellRoute } from "./app-shell-header";

export function RouteContentFallback(props: { route?: ShellRoute }) {
  const isMigratedRoute = () =>
    props.route?.kind === "home" ||
    props.route?.kind === "popular" ||
    props.route?.kind === "wallet";

  return (
    <div
      class={cn(
        "flex min-h-0 flex-1 flex-col",
        isMigratedRoute() &&
          "pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-24 md:pt-6 md:pb-8",
      )}
    >
      <RouteLoadingState />
    </div>
  );
}
