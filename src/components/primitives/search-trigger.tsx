"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

const searchTriggerVariants = cva(
  "flex w-full items-center gap-3 rounded-full border border-input bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground",
  {
    variants: {
      size: {
        default: "h-14 px-5",
        compact: "h-11 px-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface SearchTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  size?: "default" | "compact";
  placeholder?: string;
}

const SearchTrigger = React.forwardRef<HTMLButtonElement, SearchTriggerProps>(
  (
    {
      ariaLabel = "Search",
      className,
      placeholder = "Search",
      size,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        aria-label={ariaLabel}
        className={cn(searchTriggerVariants({ size }), className)}
        ref={ref}
        type={type}
        {...props}
      >
        <MagnifyingGlass className="size-5 shrink-0" />
        <span className="truncate text-base">{placeholder}</span>
      </button>
    );
  },
);
SearchTrigger.displayName = "SearchTrigger";

export { SearchTrigger, searchTriggerVariants };
