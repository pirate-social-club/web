"use client";

import * as React from "react";

import { Checkbox } from "@/components/primitives/checkbox";
import { cn } from "@/lib/utils";

export interface CheckboxCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  title: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  disabledHint?: string;
}

export const CheckboxCard = React.forwardRef<HTMLDivElement, CheckboxCardProps>(
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

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      },
      [handleClick],
    );

    return (
      <div
        ref={ref}
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-4 text-start transition-[border-color,background-color]",
          checked
            ? "border-primary bg-primary/10"
            : "border-border-soft bg-background hover:border-primary/40",
          disabled &&
            "cursor-not-allowed border-border-soft bg-muted/30 opacity-60",
          className,
        )}
        {...props}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          className="mt-0.5"
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(next) => onCheckedChange?.(next === true)}
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
      </div>
    );
  },
);
CheckboxCard.displayName = "CheckboxCard";
