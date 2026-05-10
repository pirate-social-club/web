"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { RadioIndicator } from "@/components/primitives/radio-indicator";
import { cn } from "@/lib/utils";

const optionCardVariants = cva(
  "w-full cursor-pointer rounded-[var(--radius-lg)] border p-4 text-start transition-[border-color,background-color]",
  {
    variants: {
      variant: {
        default:
          "border-border-soft bg-background text-foreground hover:border-border",
        selected: "border-primary bg-primary/5 text-foreground",
        disabled:
          "cursor-not-allowed border-border-soft bg-muted/30 opacity-60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface OptionCardProps
  extends
    React.ComponentProps<"button">,
    VariantProps<typeof optionCardVariants> {
  title: string;
  description?: string;
  selected?: boolean;
  icon?: React.ReactNode;
  disabledHint?: string;
}

function OptionCard({
  className,
  description,
  disabled,
  disabledHint,
  icon,
  ref,
  selected = false,
  title,
  type = "button",
  variant,
  ...props
}: OptionCardProps) {
  const resolvedVariant = disabled
    ? "disabled"
    : selected
      ? "selected"
      : (variant ?? "default");
  const indicator = <RadioIndicator checked={selected} />;

  return (
    <button
      className={cn(
        optionCardVariants({ variant: resolvedVariant }),
        className,
      )}
      disabled={disabled}
      ref={ref}
      type={type}
      {...props}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
            {icon}
          </span>
        ) : (
          indicator
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              "text-base font-semibold leading-tight",
              disabled && "text-muted-foreground",
            )}
          >
            {title}
          </p>
          {description ? (
            <p className="text-base leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
          {disabled && disabledHint ? (
            <p className="text-base leading-6 text-warning">{disabledHint}</p>
          ) : null}
        </div>
        {icon ? indicator : null}
      </div>
    </button>
  );
}

export { OptionCard, optionCardVariants };
