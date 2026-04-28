import * as React from "react";
import { DotsThree } from "@phosphor-icons/react";

import { IconButton } from "@/components/primitives/icon-button";
import type { ActionMenuProps } from "@/components/primitives/action-menu";
import type { PostCardMenuItem } from "./post-card.types";

type ActionMenuComponent = React.ComponentType<ActionMenuProps>;

let actionMenuModulePromise: Promise<ActionMenuComponent> | null = null;

function loadActionMenu(): Promise<ActionMenuComponent> {
  actionMenuModulePromise ??= import("@/components/primitives/action-menu")
    .then((module) => module.ActionMenu);
  return actionMenuModulePromise;
}

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
  const [ActionMenuComponent, setActionMenuComponent] = React.useState<ActionMenuComponent | null>(null);
  const [open, setOpen] = React.useState(false);

  const ensureLoaded = React.useCallback(async () => {
    if (ActionMenuComponent) {
      return ActionMenuComponent;
    }

    const loaded = await loadActionMenu();
    setActionMenuComponent(() => loaded);
    return loaded;
  }, [ActionMenuComponent]);

  const primeMenu = React.useCallback(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const handleTriggerClick = React.useCallback(async () => {
    await ensureLoaded();
    setOpen(true);
  }, [ensureLoaded]);

  if (items.length === 0) {
    return null;
  }

  if (ActionMenuComponent) {
    return (
      <ActionMenuComponent
        items={items}
        label={label}
        onAction={onAction}
        open={open}
        onOpenChange={setOpen}
      />
    );
  }

  return (
    <IconButton
      aria-label={label}
      className="shrink-0"
      data-post-card-interactive="true"
      onClick={handleTriggerClick}
      onFocus={primeMenu}
      onPointerEnter={primeMenu}
      onTouchStart={primeMenu}
      size="sm"
      type="button"
      variant="ghost"
    >
      <DotsThree className="size-5" />
    </IconButton>
  );
}
