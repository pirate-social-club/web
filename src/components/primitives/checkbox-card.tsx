"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { cn } from "@/lib/utils";

export interface CheckboxCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  title: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  disabledHint?: string;
}

export const CheckboxCard = React.forwardRef<
  HTMLButtonElement,
  CheckboxCardProps
>(
  (
    {
      title,
      description,
      checked = false,
      onCheckedChange,
      disabled,
      disabledHint,
      className,
      ...props
    },
    ref,
  ) => {
    const handleClick = React.useCallback(() => {
      if (disabled) return;
      onCheckedChange?.(!checked);
    }, [checked, disabled, onCheckedChange]);

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "flex w-full items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-4 text-start transition-[border-color,background-color]",
          checked
            ? "border-primary bg-primary/10"
            : "border-border-soft bg-background hover:border-primary/40",
          disabled && "cursor-not-allowed border-border-soft bg-muted/30 opacity-60",
          className,
        )}
        {...props}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          className="mt-0.5"
          tabIndex={-1}
          aria-hidden="true"
        />
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
      </button>
    );
  },
);
CheckboxCard.displayName = "CheckboxCard";
