"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Type } from "./type";

export interface ActionBannerProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function ActionBanner({ title, subtitle, action, className }: ActionBannerProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="min-w-0 flex-1 space-y-0.5">
        {title ? (
          <Type as="span" className="block" variant="body-strong">
            {title}
          </Type>
        ) : null}
        {subtitle ? (
          <Type as="span" className="block text-muted-foreground" variant="caption">
            {subtitle}
          </Type>
        ) : null}
      </span>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
