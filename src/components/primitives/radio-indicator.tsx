"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface RadioIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  checked?: boolean;
}

const RadioIndicator = React.forwardRef<HTMLSpanElement, RadioIndicatorProps>(
  ({ checked = false, className, ...props }, ref) => (
    <span
      aria-hidden="true"
      className={cn(
        "relative size-6 shrink-0 rounded-full border-2 bg-transparent transition-colors",
        checked ? "border-primary" : "border-border",
        checked
          ? "after:absolute after:left-1/2 after:top-1/2 after:size-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-primary after:content-['']"
          : "",
        className,
      )}
      data-state={checked ? "checked" : "unchecked"}
      ref={ref}
      role="presentation"
      {...props}
    />
  ),
);
RadioIndicator.displayName = "RadioIndicator";

export { RadioIndicator };
