"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-full border border-input bg-background px-4 text-base shadow-sm transition-[color,box-shadow,border-color] outline-none file:border-0 file:bg-transparent file:text-base file:text-foreground file:font-medium placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border-soft disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        flat: "rounded-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0",
      },
      size: {
        default: "h-11 px-4 py-2",
        lg: "h-16 px-5 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
    compoundVariants: [
      {
        variant: "flat",
        className: "px-0",
      },
    ],
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, type = "text", variant, ...props }, ref) => {
    return (
      <input
        className={cn(inputVariants({ size, variant }), className)}
        dir={props.dir ?? "auto"}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
