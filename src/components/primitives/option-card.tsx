"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const optionCardVariants = cva(
  "w-full rounded-[var(--radius-lg)] border px-4 py-4 text-left transition-[border-color,background-color]",
  {
    variants: {
      variant: {
        default:
          "border-border-soft bg-background text-foreground hover:border-primary/40",
        selected: "border-primary bg-primary/10 text-foreground",
        disabled: "cursor-not-allowed border-border-soft bg-muted/30 opacity-60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface OptionCardProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof optionCardVariants> {
  title: string;
  description?: string;
  selected?: boolean;
  icon?: React.ReactNode;
  disabledHint?: string;
}

const OptionCard = React.forwardRef<HTMLButtonElement, OptionCardProps>(
  ({ className, description, disabled, disabledHint, icon, selected = false, title, variant, type = "button", ...props }, ref) => {
    const resolvedVariant = disabled ? "disabled" : selected ? "selected" : variant ?? "default";

    return (
      <button
        className={cn(optionCardVariants({ variant: resolvedVariant }), className)}
        disabled={disabled}
        ref={ref}
        type={type}
        {...props}
      >
        <div className="space-y-1">
          <p className={cn("flex items-center gap-2 text-base font-semibold leading-tight", disabled && "text-muted-foreground")}>
            {icon}
            {title}
          </p>
          {description ? (
            <p className="text-base leading-6 text-muted-foreground">{description}</p>
          ) : null}
          {disabled && disabledHint ? (
            <p className="text-base leading-6 text-amber-700">{disabledHint}</p>
          ) : null}
        </div>
      </button>
    );
  },
);
OptionCard.displayName = "OptionCard";

export { OptionCard, optionCardVariants };
