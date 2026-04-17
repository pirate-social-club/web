"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  disabled: boolean;
  name: string;
  onValueChange: (value: string) => void;
  value: string | undefined;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext() {
  const context = React.useContext(RadioGroupContext);

  if (!context) {
    throw new Error("RadioGroupItem must be used within RadioGroup.");
  }

  return context;
}

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    defaultValue?: string;
    disabled?: boolean;
    name?: string;
    onValueChange?: (value: string) => void;
    value?: string;
  }
>(({ children, className, defaultValue, disabled = false, name, onValueChange, value, ...props }, ref) => {
  const generatedName = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  const handleValueChange = React.useCallback((nextValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
  }, [isControlled, onValueChange]);

  const contextValue = React.useMemo<RadioGroupContextValue>(() => ({
    disabled,
    name: name ?? generatedName,
    onValueChange: handleValueChange,
    value: currentValue,
  }), [currentValue, disabled, generatedName, handleValueChange, name]);

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={cn(
          "grid rounded-[calc(var(--radius-lg)+0.25rem)] bg-muted/40 p-1.5",
          className,
        )}
        role="radiogroup"
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
});
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentPropsWithoutRef<"input">, "checked" | "defaultChecked" | "onChange" | "type"> & {
    indicatorClassName?: string;
    labelClassName?: string;
    value: string;
  }
>(({ children, className, disabled, indicatorClassName, labelClassName, value, ...props }, ref) => {
  const group = useRadioGroupContext();
  const checked = group.value === value;
  const itemDisabled = group.disabled || disabled;

  return (
    <label
      className={cn(
        "cursor-pointer",
        itemDisabled && "cursor-not-allowed opacity-50",
        labelClassName,
      )}
      data-disabled={itemDisabled ? "" : undefined}
      data-state={checked ? "checked" : "unchecked"}
    >
      <input
        {...props}
        ref={ref}
        checked={checked}
        className={cn("peer sr-only", className)}
        disabled={itemDisabled}
        name={group.name}
        onChange={() => group.onValueChange(value)}
        type="radio"
        value={value}
      />
      <span
        className={cn(
          "flex min-h-12 items-center justify-center rounded-[var(--radius-lg)] px-4 py-2.5 text-base font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          checked ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
          indicatorClassName,
        )}
      >
        {children}
      </span>
    </label>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
