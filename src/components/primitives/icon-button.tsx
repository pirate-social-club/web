"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const iconButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-[color,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-border bg-card text-card-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/85",
        ghost: "text-foreground hover:bg-muted",
      },
      size: {
        sm: "size-9",
        default: "size-11",
      },
      active: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        active: true,
        variant: "secondary",
        className: "border border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      },
      {
        active: true,
        variant: "ghost",
        className: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
    ],
    defaultVariants: {
      active: false,
      variant: "secondary",
      size: "default",
    },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  active?: boolean;
  asChild?: boolean;
  loading?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, active = false, disabled, loading = false, size, variant, type = "button", ...props }, ref) => {
    return (
      <button
        className={cn(iconButtonVariants({ active, size, variant }), className)}
        data-active={active ? "true" : undefined}
        disabled={disabled || loading}
        ref={ref}
        type={type}
        {...props}
      >
        {loading ? <Spinner className="size-4" /> : props.children}
      </button>
    );
  },
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
