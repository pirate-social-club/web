"use client";

import { WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";

export function VideoFeedPaginationNotice({
  actionLabel,
  message,
  onAction,
}: {
  actionLabel: string;
  message: string;
  onAction: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+var(--header-height)+1rem)] z-30 flex justify-center md:bottom-4"
      role="status"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/15 bg-black/80 py-2 pl-4 pr-2 text-white shadow-lg backdrop-blur-md">
        <WarningCircle aria-hidden className="size-5 shrink-0 text-destructive" weight="fill" />
        <Type className="text-white" variant="caption">{message}</Type>
        <Button className="h-9 rounded-full" onClick={onAction} size="sm" variant="secondary">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
