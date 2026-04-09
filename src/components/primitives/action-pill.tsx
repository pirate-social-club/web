"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ActionPillProps {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  active?: boolean;
  activeClass?: string;
  className?: string;
}

export function ActionPill({
  children,
  onClick,
  label,
  active = false,
  activeClass = "text-primary",
  className,
}: ActionPillProps) {
  return (
    <button
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border border-border/50 bg-secondary/80 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        active && activeClass,
        className,
      )}
      onClick={onClick}
      type="button"
      aria-label={label}
    >
      {children}
    </button>
  );
}
