import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import {
  ActionMenu,
  IconArrowSquareOut,
  IconArrowsClockwise,
  IconDotsThree,
  IconDownloadSimple,
  IconFlag,
  IconLink,
  IconShareNetwork,
} from "../../../design-system";
import type { PostCardMenuIcon, PostCardMenuItem } from "./types";

const menuIconElements: Record<PostCardMenuIcon, () => JSX.Element> = {
  crosspost: () => <IconArrowsClockwise />,
  download: () => <IconDownloadSimple />,
  external: () => <IconArrowSquareOut />,
  flag: () => <IconFlag />,
  link: () => <IconLink />,
  share: () => <IconShareNetwork />,
};

/** Maps the pure icon markers from menu derivation to DS icon elements. */
export function resolveMenuItemsWithIcons(items: readonly PostCardMenuItem[]) {
  return items.map((item) => ({
    ...item,
    icon: item.icon ? menuIconElements[item.icon]() : undefined,
  }));
}

export interface PostCardActionMenuProps {
  items: PostCardMenuItem[];
  label: string;
  onAction?: (key: string) => void;
}

export function PostCardActionMenu(props: PostCardActionMenuProps) {
  return (
    <Show when={props.items.length > 0}>
      <ActionMenu
        items={resolveMenuItemsWithIcons(props.items)}
        label={props.label}
        onAction={props.onAction}
        placement="bottom-end"
        triggerClass="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        triggerContent={<IconDotsThree class="size-5" />}
      />
    </Show>
  );
}
