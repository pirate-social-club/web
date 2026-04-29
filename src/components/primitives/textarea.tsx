"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex min-h-28 w-full rounded-xl border border-input bg-background px-4 py-3 text-base shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border-soft disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        flat: "rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, variant, ...props }, ref) => {
  return (
    <textarea
      className={cn(textareaVariants({ variant }), className)}
      dir={props.dir ?? "auto"}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
