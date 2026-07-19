"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center justify-center rounded-full text-base font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground hover:bg-muted/80",
        selected: "bg-primary/10 text-primary",
        outline: "border border-border-soft bg-background text-muted-foreground hover:text-foreground",
        active: "border border-primary bg-primary/5 text-foreground",
      },
      size: {
        sm: "px-3 py-1",
        md: "px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

interface ChipProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof chipVariants> {
  leadingIcon?: React.ReactNode;
}

function Chip({ children, className, leadingIcon, ref, size, variant, ...props }: ChipProps) {
  return (
    <button
      className={cn(chipVariants({ variant, size }), className)}
      ref={ref}
      type="button"
      {...props}
    >
      {leadingIcon ? <span className="me-1.5">{leadingIcon}</span> : null}
      {children}
    </button>
  );
}

export { Chip,  };
