"use client";

import * as React from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { PillButton, pillButtonVariants } from "@/components/primitives/pill-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/primitives/sheet";
import { cn } from "@/lib/utils";
import { Type } from "@/components/primitives/type";

export interface ResponsiveOptionSelectOption<TValue extends string = string> {
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  icon?: React.ReactNode;
  label: string;
  value: TValue;
}

export interface ResponsiveOptionSelectProps<TValue extends string = string> {
  ariaLabel: string;
  className?: string;
  drawerTitle: string;
  mobileTrigger?: React.ReactNode;
  onValueChange?: (value: TValue) => void;
  options: readonly ResponsiveOptionSelectOption<TValue>[];
  placeholder?: string;
  selectAlign?: "start" | "center" | "end";
  size?: "default" | "lg";
  triggerContent?: React.ReactNode;
  triggerClassName?: string;
  value?: TValue;
}

export function ResponsiveOptionSelect<TValue extends string = string>({
  ariaLabel,
  className,
  drawerTitle,
  mobileTrigger,
  onValueChange,
  options,
  placeholder,
  selectAlign = "end",
  size = "default",
  triggerContent,
  triggerClassName,
  value,
}: ResponsiveOptionSelectProps<TValue>) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (!value || options.length === 0) return null;

  const activeLabel = options.find((option) => option.value === value)?.label ?? placeholder ?? value;
  const triggerSizeClassName = size === "lg" ? "h-12" : "h-11";

  function handleChange(nextValue: TValue) {
    onValueChange?.(nextValue);
    setDrawerOpen(false);
  }

  return (
    <div className={cn("inline-flex", className)}>
      <div className="w-full md:hidden">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            {mobileTrigger ?? (
              <PillButton aria-label={ariaLabel} className={cn(triggerSizeClassName, "max-w-48 gap-1.5 px-4", triggerClassName)} tone="default">
                {triggerContent ?? <span className="truncate">{activeLabel}</span>}
                <CaretDown aria-hidden="true" className="size-4 shrink-0" weight="bold" />
              </PillButton>
            )}
          </SheetTrigger>
          <SheetContent className="max-h-[75dvh] rounded-t-[var(--radius-3xl)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4" side="bottom">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" aria-hidden="true" />
            <SheetHeader className="pe-12 text-start">
              <SheetTitle>{drawerTitle}</SheetTitle>
            </SheetHeader>
            <div className="mt-5 grid gap-3">
              {options.map((option) => (
                <Button
                  className="h-auto min-h-14 w-full justify-between px-4 py-3"
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => handleChange(option.value)}
                  trailingIcon={option.value === value ? <Check aria-hidden="true" className="size-5 shrink-0" weight="bold" /> : null}
                  variant={option.value === value ? "default" : "secondary"}
                >
                  <span className="flex min-w-0 items-center gap-3 text-start">
                    {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
                    <span className="min-w-0 space-y-0.5">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <Type as="span" variant="caption" className="block whitespace-normal">
                          {option.description}
                        </Type>
                      ) : null}
                      {option.disabled && option.disabledReason ? (
                        <Type as="span" variant="caption" className="block whitespace-normal text-warning">
                          {option.disabledReason}
                        </Type>
                      ) : null}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="hidden md:block">
        <Select onValueChange={(nextValue) => onValueChange?.(nextValue as TValue)} value={value}>
          <SelectTrigger
            aria-label={ariaLabel}
            className={cn(
              pillButtonVariants({ tone: "default" }),
              triggerSizeClassName,
              "w-auto min-w-32 justify-between gap-2 bg-card py-0 pe-3 ps-4 shadow-none",
              triggerClassName,
            )}
          >
            {triggerContent ?? <SelectValue placeholder={placeholder} />}
          </SelectTrigger>
          <SelectContent align={selectAlign}>
            {options.map((option) => (
              <SelectItem className={cn(option.description && "items-start py-3")} disabled={option.disabled} key={option.value} value={option.value}>
                <span className="flex min-w-0 items-center gap-3">
                  {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
                  <span className="min-w-0 space-y-0.5">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <Type as="span" variant="caption" className="block">
                        {option.description}
                      </Type>
                    ) : null}
                    {option.disabled && option.disabledReason ? (
                      <Type as="span" variant="caption" className="block text-warning">
                        {option.disabledReason}
                      </Type>
                    ) : null}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
