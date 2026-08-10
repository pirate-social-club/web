import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

interface ScrubberProps {
  value: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  showThumb?: boolean;
  showValueBubble?: boolean;
  ariaLabel?: string;
  ariaValueText?: string;
  valueLabel?: string;
}

export function Scrubber({
  value,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  className,
  showThumb = false,
  showValueBubble = false,
  ariaLabel,
  ariaValueText,
  valueLabel,
}: ScrubberProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const progressPercent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bubbleVisible = showValueBubble && Boolean(valueLabel) && (isDragging || isFocused);

  return (
    <SliderPrimitive.Root
      className={cn(
        "group relative flex w-full cursor-pointer touch-none select-none items-center",
        disabled && "pointer-events-none cursor-default opacity-60",
        className
      )}
      value={[value]}
      max={max}
      step={step}
      onValueChange={([v]) => onChange?.(v)}
      onPointerCancel={() => setIsDragging(false)}
      onPointerDown={() => {
        if (!disabled) setIsDragging(true);
      }}
      onPointerUp={() => setIsDragging(false)}
      disabled={disabled}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
        onBlur={() => setIsFocused(false)}
        onFocus={() => setIsFocused(true)}
        className={cn(
          "block size-3.5 rounded-full border border-background bg-primary shadow-sm",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "hover:scale-110",
          // Show thumb on hover of the scrubber
          showThumb ? "" : "opacity-0 group-hover:opacity-100"
        )}
      />
      {bubbleVisible ? (
        <Type
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(50%+0.75rem)] z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 tabular-nums text-background shadow-md"
          style={{ left: `clamp(2.25rem, ${progressPercent}%, calc(100% - 2.25rem))` }}
          variant="label"
        >
          {valueLabel}
        </Type>
      ) : null}
    </SliderPrimitive.Root>
  );
}
