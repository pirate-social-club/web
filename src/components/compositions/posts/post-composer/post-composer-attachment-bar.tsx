"use client";

import type * as React from "react";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";

import { tabMeta } from "./post-composer-config";
import type { AttachmentKind } from "./post-composer.types";

export function PostComposerAttachmentBar({
  activeKind,
  availableKinds,
  onSelect,
}: {
  activeKind: AttachmentKind | null;
  availableKinds: AttachmentKind[];
  onSelect: (kind: AttachmentKind) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {availableKinds.map((kind) => {
        const meta = tabMeta[kind];
        return (
          <button
            aria-label={meta.label}
            className={cn(
              "grid size-11 place-items-center rounded-full border transition-colors",
              activeKind === kind
                ? "border-primary bg-primary-subtle text-primary"
                : "border-border-soft text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            key={kind}
            onClick={() => onSelect(kind)}
            type="button"
          >
            {meta.icon}
          </button>
        );
      })}
    </div>
  );
}

export function PostComposerMobileAttachmentBar({
  actions,
  activeKind,
  bottomOffset,
  onSelect,
}: {
  actions: Array<{
    icon: React.ReactNode;
    kind: AttachmentKind;
    label: string;
  }>;
  activeKind: AttachmentKind | null;
  bottomOffset: number;
  onSelect: (kind: AttachmentKind) => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-30 border-t border-border-soft bg-background/95 px-5 pt-3 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{ bottom: bottomOffset }}
    >
      <div className="flex items-center justify-between">
        {actions.map((action) => (
          <button
            aria-label={action.label}
            className={cn(
              "grid size-11 place-items-center rounded-full text-muted-foreground transition-colors",
              activeKind === action.kind && "bg-muted text-foreground",
            )}
            key={action.kind}
            onClick={() => onSelect(action.kind)}
            type="button"
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PostComposerDesktopAttachmentToolbar({
  actions,
  activeKind,
  onSelect,
}: {
  actions: Array<{
    icon: React.ReactNode;
    kind: AttachmentKind;
    label: string;
  }>;
  activeKind: AttachmentKind | null;
  onSelect: (kind: AttachmentKind) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <Button
          active={activeKind === action.kind}
          key={action.kind}
          leadingIcon={action.icon}
          onClick={() => onSelect(action.kind)}
          size="sm"
          variant={activeKind === action.kind ? "default" : "outline"}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
