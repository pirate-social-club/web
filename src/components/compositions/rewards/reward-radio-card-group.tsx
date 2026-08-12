"use client";

import * as React from "react";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

interface RewardRadioCardGroupProps<Value extends string> {
  label: string;
  labels: Record<Value, string>;
  onChange?: (value: Value) => void;
  options: Value[];
  value: Value;
}

export function RewardRadioCardGroup<Value extends string>({
  label,
  labels,
  onChange,
  options,
  value,
}: RewardRadioCardGroupProps<Value>) {
  const labelId = React.useId();
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const lastIndex = options.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    const next = options[nextIndex];
    onChange?.(next);
    document.getElementById(`${labelId}-${next}`)?.focus();
  };

  return (
    <div>
      <Type as="span" className="mb-2 block text-muted-foreground" id={labelId} variant="label">{label}</Type>
      <div aria-labelledby={labelId} className="grid gap-2" role="radiogroup">
        {options.map((option, index) => {
          const selected = value === option;
          return (
            <button
              aria-checked={selected}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg border px-4 text-start transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected ? "border-primary/40 bg-primary-subtle" : "border-border-soft",
              )}
              id={`${labelId}-${option}`}
              key={option}
              onClick={() => onChange?.(option)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              role="radio"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span aria-hidden="true" className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-primary" : "border-muted-foreground/50",
              )}>
                {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
              </span>
              <Type as="span" variant="body">{labels[option]}</Type>
            </button>
          );
        })}
      </div>
    </div>
  );
}
