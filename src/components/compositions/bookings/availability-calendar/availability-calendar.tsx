import * as React from "react";

import { Card, CardContent } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { IanaTz, IsoInstant, ResolvedSlot } from "@pirate/bookings-domain";

import {
  formatCentsAsUsd,
  formatSlotDuration,
  formatSlotTime,
  formatTzAbbrev,
  formatTzLabel,
} from "../fixtures/bookings-format";

export interface AvailabilityCalendarProps {
  slots: ResolvedSlot[];
  viewerTimezone: IanaTz;
  selectedStartUtc?: IsoInstant;
  onSelectSlot?: (slot: ResolvedSlot) => void;
  className?: string;
}

interface DayGroup {
  dateKey: string;
  label: string;
  slots: ResolvedSlot[];
  ambiguousTimes: Set<string>;
}

function groupSlotsByDay(slots: ResolvedSlot[], viewerTz: IanaTz): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const slot of slots) {
    const dateKey = new Intl.DateTimeFormat("en", {
      timeZone: viewerTz,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(slot.startUtc));
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { dateKey, label: dateKey, slots: [], ambiguousTimes: new Set() });
    }
    groups.get(dateKey)!.slots.push(slot);
  }
  // Detect duplicate local time strings within each day (DST fall-back repeated hour).
  for (const group of groups.values()) {
    const seen = new Map<string, number>();
    for (const slot of group.slots) {
      const timeLabel = formatSlotTime(slot.startUtc, viewerTz);
      seen.set(timeLabel, (seen.get(timeLabel) ?? 0) + 1);
    }
    for (const [timeLabel, count] of seen) {
      if (count > 1) group.ambiguousTimes.add(timeLabel);
    }
  }
  return [...groups.values()];
}

export function AvailabilityCalendar({
  slots,
  viewerTimezone,
  selectedStartUtc,
  onSelectSlot,
  className,
}: AvailabilityCalendarProps) {
  const dayGroups = React.useMemo(() => groupSlotsByDay(slots, viewerTimezone), [slots, viewerTimezone]);

  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Type variant="caption">No open slots in this window.</Type>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <Type variant="label">Times in {formatTzLabel(viewerTimezone)}</Type>
      </div>
      <div className="flex flex-col gap-4">
        {dayGroups.map((day) => (
          <div key={day.dateKey} className="flex flex-col gap-2">
            <Type as="h3" variant="h4">
              {day.label}
            </Type>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {day.slots.map((slot) => {
                const isSelected = slot.startUtc === selectedStartUtc;
                const timeLabel = formatSlotTime(slot.startUtc, viewerTimezone);
                const isAmbiguous = day.ambiguousTimes.has(timeLabel);
                const displayTime = isAmbiguous
                  ? `${timeLabel} ${formatTzAbbrev(slot.startUtc, viewerTimezone)}`
                  : timeLabel;
                return (
                  <button
                    key={slot.startUtc}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
                      slot.available
                        ? isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border-soft bg-card hover:bg-card/85"
                        : "border-border-soft bg-surface-skeleton opacity-50",
                    )}
                    disabled={!slot.available}
                    onClick={() => onSelectSlot?.(slot)}
                    type="button"
                  >
                    <Type
                      variant="body-strong"
                      className={cn(isSelected && "text-primary-foreground")}
                    >
                      {displayTime}
                    </Type>
                    <Type
                      variant="caption"
                      className={cn(isSelected && "text-primary-foreground/80")}
                    >
                      {formatSlotDuration(slot.startUtc, slot.endUtc)}
                    </Type>
                    <Type
                      variant="caption"
                      className={cn(isSelected && "text-primary-foreground/80")}
                    >
                      {formatCentsAsUsd(slot.priceCents)}
                    </Type>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
