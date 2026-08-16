import { For, Show } from "solid-js";

import { Type, cn } from "../../../design-system";
import { formatCentsAsUsdc, formatSlotDuration, formatSlotTime } from "../booking-format";
import type { IanaTz, ResolvedSlot } from "../view-models";

export interface SlotPickerProps {
  slots: ResolvedSlot[];
  viewerTimezone: IanaTz;
  selectedStartUtc?: string;
  onSelectSlot?: (slot: ResolvedSlot) => void;
  class?: string;
}

export function SlotPicker(props: SlotPickerProps) {
  return (
    <Show
      when={props.slots.length > 0}
      fallback={
        <div class={cn("rounded-[var(--radius-md)] border border-border-soft bg-card p-6 text-center", props.class)}>
          <Type variant="caption">No slots available for this day.</Type>
        </div>
      }
    >
      <div
        class={cn("flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-2", props.class)}
        role="listbox"
        aria-label="Available booking times"
      >
        <For each={props.slots}>
          {(slot) => {
            const isSelected = () => slot.startUtc === props.selectedStartUtc;

            return (
              <button
                class={cn(
                  "flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-3 transition-colors",
                  slot.available
                    ? isSelected()
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-soft bg-card hover:bg-card/85"
                    : "border-border-soft bg-surface-skeleton opacity-50",
                )}
                disabled={!slot.available}
                onClick={() => props.onSelectSlot?.(slot)}
                role="option"
                aria-selected={isSelected() ? "true" : "false"}
                type="button"
              >
                <div class="flex flex-col items-start gap-1">
                  <Type
                    variant="body-strong"
                    class={cn(isSelected() && "text-primary-foreground")}
                  >
                    {formatSlotTime(slot.startUtc, props.viewerTimezone)}
                  </Type>
                  <Type
                    variant="caption"
                    class={cn(isSelected() && "text-primary-foreground/80")}
                  >
                    {formatSlotDuration(slot.startUtc, slot.endUtc)}
                  </Type>
                </div>
                <Type
                  variant="body-strong"
                  class={cn(isSelected() && "text-primary-foreground")}
                >
                  {formatCentsAsUsdc(slot.priceCents)}
                </Type>
              </button>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
