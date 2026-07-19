"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.ComponentProps<"button">, "onChange" | "role"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Switch({ checked = false, className, disabled, onCheckedChange, ref, type = "button", ...props }: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-muted transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked);
        }
      }}
      ref={ref}
      role="switch"
      type={type}
    >
      <span
        className={cn(
          "size-5 translate-x-1 rounded-full bg-background shadow-sm transition-transform",
          checked && "translate-x-6",
        )}
      />
    </button>
  );
}

export { Switch };
