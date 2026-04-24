"use client";

import * as React from "react";
import { Check } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
}

export interface StepperProps {
  className?: string;
  currentStep: number;
  onStepClick?: (step: number) => void;
  steps: StepperStep[];
}

export interface StepProgressProps {
  className?: string;
  currentStep: number;
  progressLabel?: string;
  stepCountLabel?: string;
  steps: StepperStep[];
}

function Stepper({ className, currentStep, onStepClick, steps }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("flex w-full items-start", className)}>
      {steps.map((step, i) => {
        const completed = currentStep > i + 1;
        const active = currentStep === i + 1;
        const disabled = i + 1 > currentStep;
        const indicatorClass = active
          ? "bg-foreground text-background"
          : completed
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground";
        const labelClass = active
          ? "text-foreground font-semibold"
          : completed
            ? "text-foreground"
            : "text-muted-foreground";
        const lineClass = currentStep > i ? "bg-foreground" : "bg-border-soft";

        return (
          <React.Fragment key={i}>
            <div className="relative flex flex-1 flex-col items-center gap-2">
              <button
                className={cn(
                  "flex flex-col items-center gap-2 rounded-full py-1.5 text-base transition-colors",
                  labelClass,
                )}
                disabled={disabled}
                onClick={() => onStepClick?.(i + 1)}
                type="button"
              >
                <span className={cn("grid size-8 place-items-center rounded-full text-base font-semibold", indicatorClass)}>
                  {completed ? <Check className="size-4" weight="bold" /> : i + 1}
                </span>
                <span className="text-base">{step.label}</span>
              </button>
              {steps.length > i + 1 && (
                <div
                  className={cn("absolute m-0 h-px", lineClass)}
                  style={{
                    insetInlineStart: "calc(50% + 1.25rem)",
                    top: "calc(0.375rem + 1rem)",
                    width: "calc(100% - 2.5rem)",
                  }}
                />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function StepProgress({
  className,
  currentStep,
  progressLabel,
  stepCountLabel,
  steps,
}: StepProgressProps) {
  const safeStep = Math.min(Math.max(currentStep, 1), steps.length);
  const progress = steps.length > 0 ? `${(safeStep / steps.length) * 100}%` : "0%";
  const currentLabel = steps[safeStep - 1]?.label ?? "";

  return (
    <nav aria-label="Progress" className={cn("space-y-2", className)}>
      {progressLabel ? (
        <div className="text-base text-muted-foreground">{progressLabel}</div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-foreground">{currentLabel}</div>
        {stepCountLabel ? <div className="text-base tabular-nums text-muted-foreground">{stepCountLabel}</div> : null}
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-[width]"
          style={{ width: progress }}
        />
      </div>
    </nav>
  );
}

export { Stepper, StepProgress };
