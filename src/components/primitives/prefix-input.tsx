"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const prefixInputVariants = cva(
  "flex items-center overflow-hidden rounded-full border border-input bg-background shadow-sm transition-[color,box-shadow,border-color] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
  {
    variants: {
      size: {
        default: "h-12",
        lg: "h-14",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface PrefixInputProps extends Omit<React.ComponentProps<"input">, "size">, VariantProps<typeof prefixInputVariants> {
  prefix: string;
}

const PrefixInput = React.forwardRef<HTMLInputElement, PrefixInputProps>(
  ({ className, prefix, size, ...props }, ref) => {
    return (
      <div className={cn(prefixInputVariants({ size }), className)}>
        <div className="grid h-full w-12 shrink-0 place-items-center border-r border-border-soft bg-muted/40 text-base font-semibold text-foreground">
          {prefix}
        </div>
        <input
          className="h-full w-full rounded-none border-0 bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground focus:ring-0 focus:ring-offset-0"
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
PrefixInput.displayName = "PrefixInput";

export { PrefixInput, prefixInputVariants };
