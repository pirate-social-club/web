
import { Type } from "@/components/primitives/type";
import { formatCentsAsUsdc } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";
import type { IanaTz, ResolvedSlot } from "../view-models";

import {
  formatSlotDuration,
  formatSlotTime,
} from "../booking-format";

export interface SlotPickerProps {
  slots: ResolvedSlot[];
  viewerTimezone: IanaTz;
  selectedStartUtc?: string;
  onSelectSlot?: (slot: ResolvedSlot) => void;
  className?: string;
}

export function SlotPicker({
  slots,
  viewerTimezone,
  selectedStartUtc,
  onSelectSlot,
  className,
}: SlotPickerProps) {
  if (slots.length === 0) {
    return (
      <div className={cn("rounded-[var(--radius-md)] border border-border-soft bg-card p-6 text-center", className)}>
        <Type variant="caption">No slots available for this day.</Type>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-2",
        className,
      )}
      role="listbox"
    >
      {slots.map((slot) => {
        const isSelected = slot.startUtc === selectedStartUtc;
        return (
          <button
            key={slot.startUtc}
            className={cn(
              "flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-3 transition-colors",
              slot.available
                ? isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-soft bg-card hover:bg-card/85"
                : "border-border-soft bg-surface-skeleton opacity-50",
            )}
            disabled={!slot.available}
            onClick={() => onSelectSlot?.(slot)}
            role="option"
            aria-selected={isSelected}
            type="button"
          >
            <div className="flex flex-col items-start gap-1">
              <Type
                variant="body-strong"
                className={cn(isSelected && "text-primary-foreground")}
              >
                {formatSlotTime(slot.startUtc, viewerTimezone)}
              </Type>
              <Type
                variant="caption"
                className={cn(isSelected && "text-primary-foreground/80")}
              >
                {formatSlotDuration(slot.startUtc, slot.endUtc)}
              </Type>
            </div>
            <Type
              variant="body-strong"
              className={cn(isSelected && "text-primary-foreground")}
            >
              {formatCentsAsUsdc(slot.priceCents)}
            </Type>
          </button>
        );
      })}
    </div>
  );
}
