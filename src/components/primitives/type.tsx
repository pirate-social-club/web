"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const typeVariants = cva("", {
  variants: {
    variant: {
      display:
        "text-4xl font-bold tracking-tight text-foreground md:text-5xl",
      h1: "text-3xl font-semibold tracking-tight text-foreground",
      h2: "text-2xl font-semibold tracking-tight text-foreground",
      h3: "text-xl font-semibold tracking-tight text-foreground",
      h4: "text-lg font-semibold tracking-tight text-foreground",
      body: "text-base font-normal leading-6 text-foreground",
      "body-strong": "text-base font-semibold leading-6 text-foreground",
      label: "text-base font-medium leading-tight text-foreground",
      caption: "text-base font-normal leading-5 text-muted-foreground",
      overline:
        "text-base font-medium uppercase tracking-[0.03em] text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "body",
  },
});

type TypeVariant = VariantProps<typeof typeVariants>["variant"];

export interface TypeProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  variant?: TypeVariant;
}

const Type = React.forwardRef<HTMLElement, TypeProps>(
  ({ as: Component = "span", className, variant, ...props }, ref) => {
    return (
      <Component
        className={cn(typeVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Type.displayName = "Type";

export { Type, typeVariants };
