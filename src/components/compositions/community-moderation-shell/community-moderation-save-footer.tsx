"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";

export interface CommunityModerationSaveFooterProps {
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onSave?: () => void;
  primaryLabel?: string;
  secondaryAction?: React.ReactNode;
}

export function CommunityModerationSaveFooter({
  className,
  disabled = false,
  loading = false,
  onSave,
  primaryLabel = "Save",
  secondaryAction,
}: CommunityModerationSaveFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 mt-auto border-t border-border-soft bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-12">
          {secondaryAction}
        </div>
        <Button className="w-full sm:w-auto" disabled={disabled} loading={loading} onClick={onSave}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
