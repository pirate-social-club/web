import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { formatCentsAsUsd } from "@/lib/formatting/currency";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import type { IanaTz, IsoInstant, ResolvedSlot } from "../view-models";

import {
  formatBookingDate,
  formatDayPillDay,
  formatDayPillWeekday,
  formatSlotDuration,
  formatSlotTime,
  formatTzAbbrev,
  getSlotUniformity,
} from "../booking-format";

export interface AvailabilityCalendarProps {
  slots: ResolvedSlot[];
  viewerTimezone: IanaTz;
  selectedStartUtc?: IsoInstant;
  getSlotHref?: (slot: ResolvedSlot) => string;
  onSelectSlot?: (slot: ResolvedSlot, event?: React.MouseEvent) => void;
  className?: string;
}

interface DayGroup {
  dateKey: string;
  label: string;
  weekdayShort: string;
  dayOfMonth: string;
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
      groups.set(dateKey, {
        dateKey,
        label: dateKey,
        weekdayShort: formatDayPillWeekday(slot.startUtc, viewerTz),
        dayOfMonth: formatDayPillDay(slot.startUtc, viewerTz),
        slots: [],
        ambiguousTimes: new Set(),
      });
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

/** The day shown first: the earliest day that actually has a bookable slot. */
function defaultDayKey(dayGroups: DayGroup[]): string | null {
  return dayGroups.find((day) => day.slots.some((slot) => slot.available))?.dateKey
    ?? dayGroups[0]?.dateKey
    ?? null;
}

/**
 * Calendly-style slot picker: a day strip on top, one day's slots below, and a confirm
 * footer once a slot is chosen. Slot chips carry ONLY the time — duration/price are stated
 * once by the surrounding panel (or per chip here only when they genuinely vary).
 *
 * Layout contract: the strip and footer are flex regions outside the internal slot-list
 * scroll area (never position:fixed), so they stay visible in the feed dock, the mobile
 * Sheet, and an unconstrained page flow. When no ancestor constrains height, the list
 * simply grows and the page scrolls as before.
 */
export function AvailabilityCalendar({
  slots,
  viewerTimezone,
  selectedStartUtc,
  getSlotHref,
  onSelectSlot,
  className,
}: AvailabilityCalendarProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  const dayGroups = React.useMemo(() => groupSlotsByDay(slots, viewerTimezone), [slots, viewerTimezone]);
  const uniformity = React.useMemo(() => getSlotUniformity(slots), [slots]);
  // Without a selection handler there is nothing to confirm (owner preview) — chips are inert.
  const interactive = Boolean(onSelectSlot || getSlotHref);

  const [activeDayKey, setActiveDayKey] = React.useState<string | null>(() => defaultDayKey(dayGroups));
  const [chosenStartUtc, setChosenStartUtc] = React.useState<IsoInstant | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // A fresh slot set (refetch, another host, a timezone change) resets the day and any tentative pick.
  React.useEffect(() => {
    setActiveDayKey(defaultDayKey(dayGroups));
    setChosenStartUtc(null);
  }, [dayGroups]);

  const activeDay = dayGroups.find((day) => day.dateKey === activeDayKey) ?? dayGroups[0];
  const effectiveSelectedStart = chosenStartUtc ?? selectedStartUtc ?? null;
  const selectedSlot = effectiveSelectedStart
    ? slots.find((slot) => slot.startUtc === effectiveSelectedStart && slot.available) ?? null
    : null;

  const selectDay = (dateKey: string) => {
    setActiveDayKey(dateKey);
    // Day lengths differ; always re-enter a day at the top of its slot list.
    listRef.current?.scrollTo?.({ top: 0 });
  };

  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Type variant="caption">No open slots in this window.</Type>
        </CardContent>
      </Card>
    );
  }

  const continueHref = selectedSlot ? getSlotHref?.(selectedSlot) : undefined;
  const onContinue = (event: React.MouseEvent) => {
    if (selectedSlot) onSelectSlot?.(selectedSlot, event);
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <div
        className="flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 [touch-action:pan-x]"
        data-booking-day-strip
      >
        {dayGroups.map((day) => {
          const isActive = day.dateKey === activeDay?.dateKey;
          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-[var(--radius-md)] border px-3 py-1.5 transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-soft bg-card hover:bg-card/85",
              )}
              key={day.dateKey}
              onClick={() => selectDay(day.dateKey)}
              type="button"
            >
              <Type variant="caption" className={cn(isActive && "text-primary-foreground/80")}>
                {day.weekdayShort}
              </Type>
              <Type variant="body-strong" className={cn(isActive && "text-primary-foreground")}>
                {day.dayOfMonth}
              </Type>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" ref={listRef}>
        {activeDay ? (
          <>
            <Type as="h3" variant="label" className="mb-2">
              {activeDay.label}
            </Type>
            {activeDay.slots.some((slot) => slot.available) ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activeDay.slots.map((slot) => {
                  const isSelected = slot.startUtc === effectiveSelectedStart;
                  const timeLabel = formatSlotTime(slot.startUtc, viewerTimezone);
                  const isAmbiguous = activeDay.ambiguousTimes.has(timeLabel);
                  const displayTime = isAmbiguous
                    ? `${timeLabel} ${formatTzAbbrev(slot.startUtc, viewerTimezone)}`
                    : timeLabel;
                  const chipClassName = cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] border px-2 py-2.5 text-center transition-colors",
                    slot.available
                      ? isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-soft bg-card hover:bg-card/85"
                      : "border-border-soft bg-surface-skeleton opacity-50",
                  );
                  const content = (
                    <>
                      <Type
                        variant="body-strong"
                        className={cn("whitespace-nowrap", isSelected && "text-primary-foreground")}
                      >
                        {displayTime}
                      </Type>
                      {!uniformity.sameDuration ? (
                        <Type
                          variant="caption"
                          className={cn(isSelected && "text-primary-foreground/80")}
                        >
                          {formatSlotDuration(slot.startUtc, slot.endUtc)}
                        </Type>
                      ) : null}
                      {!uniformity.samePrice ? (
                        <Type
                          variant="caption"
                          className={cn(isSelected && "text-primary-foreground/80")}
                        >
                          {formatCentsAsUsd(slot.priceCents)}
                        </Type>
                      ) : null}
                    </>
                  );
                  if (!interactive) {
                    return (
                      <div className={chipClassName} key={slot.startUtc}>
                        {content}
                      </div>
                    );
                  }
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={chipClassName}
                      disabled={!slot.available}
                      key={slot.startUtc}
                      onClick={() => setChosenStartUtc(slot.startUtc)}
                      type="button"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            ) : (
              <Type as="p" variant="caption" className="text-muted-foreground">
                {copy.bookDayNoTimes}
              </Type>
            )}
          </>
        ) : null}
      </div>

      {interactive && selectedSlot ? (
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-t border-border-soft bg-card pt-3"
          data-booking-confirm-footer
        >
          <div className="min-w-0">
            <Type as="p" variant="body-strong" className="whitespace-nowrap">
              {formatBookingDate(selectedSlot.startUtc, viewerTimezone)}
              {" · "}
              {formatSlotTime(selectedSlot.startUtc, viewerTimezone)}
            </Type>
            <Type as="p" variant="caption" className="text-muted-foreground">
              {formatSlotDuration(selectedSlot.startUtc, selectedSlot.endUtc)}
              {" · "}
              {formatCentsAsUsd(selectedSlot.priceCents)}
            </Type>
          </div>
          {continueHref ? (
            <Button asChild size="sm">
              {/* The container may preventDefault (e.g. gate logged-out taps into sign-in). */}
              <a href={continueHref} onClick={onContinue}>{copy.bookContinue}</a>
            </Button>
          ) : (
            <Button onClick={onContinue} size="sm" type="button">
              {copy.bookContinue}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
