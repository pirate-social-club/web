"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pillButtonVariants = cva(
  "inline-flex h-9 items-center justify-center rounded-full border px-4 text-base font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        default:
          "border-border-soft bg-card text-muted-foreground hover:bg-muted/45 hover:text-foreground",
        selected:
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillButtonVariants> {}

const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, tone, type = "button", ...props }, ref) => (
    <button
      className={cn(pillButtonVariants({ tone }), className)}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

PillButton.displayName = "PillButton";

export { PillButton, pillButtonVariants };
