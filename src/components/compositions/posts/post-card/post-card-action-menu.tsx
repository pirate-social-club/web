import * as React from "react";

import { ActionMenu } from "@/components/primitives/action-menu";
import type { PostCardMenuItem } from "./post-card.types";

export interface PostCardActionMenuProps {
  items: PostCardMenuItem[];
  label: string;
  onAction?: (key: string) => void;
}

export function PostCardActionMenu({
  items,
  label,
  onAction,
}: PostCardActionMenuProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ActionMenu
      items={items}
      label={label}
      onAction={onAction}
      triggerClassName="shrink-0"
    />
  );
}
