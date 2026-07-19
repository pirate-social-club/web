"use client";

import * as React from "react";

import { createPortal } from "react-dom";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";

import type { AttachmentKind } from "./post-composer.types";

export function PostComposerMobileAttachmentBar({
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
  const bar = (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-background/95 px-5 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between py-3">
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

  if (typeof document === "undefined") return bar;

  return createPortal(bar, document.body);
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
