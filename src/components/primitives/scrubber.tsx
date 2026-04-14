import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface ScrubberProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  showThumb?: boolean;
}

export function Scrubber({ 
  value, 
  max = 100, 
  onChange, 
  disabled = false,
  className,
  showThumb = false,
}: ScrubberProps) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "group relative flex w-full touch-none select-none items-center",
        disabled && "pointer-events-none opacity-60",
        className
      )}
      value={[value]}
      max={max}
      step={1}
      onValueChange={([v]) => onChange?.(v)}
      disabled={disabled}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          "block size-3.5 rounded-full border-2 border-primary bg-background shadow-sm",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "hover:scale-110",
          // Show thumb on hover of the scrubber or when dragging
          showThumb ? "" : "opacity-0 group-hover:opacity-100",
          "data-[state=active]:opacity-100 data-[state=active]:scale-110"
        )}
      />
    </SliderPrimitive.Root>
  );
}
