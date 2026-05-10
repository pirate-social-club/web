"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { typeVariants } from "./type";

const labelVariants = cva(
  [typeVariants({ variant: "label" }), "peer-disabled:cursor-not-allowed peer-disabled:opacity-70"],
  {
    variants: {
      tone: {
        default: "",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

function Label({
  className,
  ref,
  tone,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>) {
  return (
    <LabelPrimitive.Root
      className={cn(labelVariants({ tone }), className)}
      ref={ref}
      {...props}
    />
  );
}

export { Label };
