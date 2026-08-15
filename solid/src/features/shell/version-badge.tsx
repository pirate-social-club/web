import type { JSX } from "@solidjs/web";

import { Type } from "../../design-system";

export interface VersionBadgeProps {
  webSha?: string | null;
  apiSha?: string | null;
}

/**
 * Presentational version badge. The React version fetched /__version itself;
 * the Solid port takes resolved SHAs as props so stories stay offline and the
 * host owns fetching.
 */
export function VersionBadge(props: VersionBadgeProps): JSX.Element {
  return (
    <Type
      as="div"
      variant="caption"
      class="group-data-[collapsible=icon]:hidden select-text leading-tight text-sidebar-foreground/45"
    >
      <div>web {props.webSha ?? "-"}</div>
      <div>api {props.apiSha ?? "-"}</div>
    </Type>
  );
}
