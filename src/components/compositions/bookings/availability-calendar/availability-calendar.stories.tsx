import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveSlots } from "@pirate/bookings-domain/test";
import {
  basePrice5000,
  defaultBookingPolicy,
  noExceptions,
  viennaWeekdayRule,
  type AvailabilityRule,
} from "@pirate/bookings-domain/test";

import type { IsoInstant, ResolvedSlot } from "../view-models";
import { AvailabilityCalendar } from "../availability-calendar/availability-calendar";

const meta = {
  title: "Compositions/Bookings/AvailabilityCalendar",
  component: AvailabilityCalendar,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AvailabilityCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

function slot(startUtc: string, endUtc: string, priceCents = 5000, available = true): ResolvedSlot {
  return { startUtc, endUtc, priceCents, available } as ResolvedSlot;
}

/** Uniform 30-min $50 slots across three days. */
const UNIFORM_WEEK: ResolvedSlot[] = [
  slot("2026-09-21T09:00:00.000Z", "2026-09-21T09:30:00.000Z"),
  slot("2026-09-21T10:00:00.000Z", "2026-09-21T10:30:00.000Z"),
  slot("2026-09-21T11:00:00.000Z", "2026-09-21T11:30:00.000Z", 5000, false),
  slot("2026-09-22T14:00:00.000Z", "2026-09-22T14:30:00.000Z"),
  slot("2026-09-22T15:00:00.000Z", "2026-09-22T15:30:00.000Z"),
  slot("2026-09-23T16:00:00.000Z", "2026-09-23T16:30:00.000Z"),
];

/** Same shape but with genuinely mixed prices → per-chip captions. */
const MIXED_WEEK: ResolvedSlot[] = UNIFORM_WEEK.map((s, index) => ({
  ...s,
  priceCents: index % 2 === 0 ? 3500 : 7500,
}));

/** Simulates the feed dock: fixed height, so the strip/footer regions and list scroll show. */
function DockFrame({ children }: React.PropsWithChildren) {
  return (
    <div className="mx-auto flex h-[32rem] max-w-sm flex-col border border-border-soft bg-card p-4">
      {children}
    </div>
  );
}

const demoGetSlotHref = (s: ResolvedSlot) =>
  `/book/usr_host/checkout?start=${encodeURIComponent(s.startUtc)}`;

export const UniformSlotsNoCaptions: Story = {
  render: () => (
    <DockFrame>
      <AvailabilityCalendar
        slots={UNIFORM_WEEK}
        viewerTimezone="Europe/Vienna"
        getSlotHref={demoGetSlotHref}
        onSelectSlot={() => {}}
      />
    </DockFrame>
  ),
};

export const MixedPricingCaptions: Story = {
  render: () => (
    <DockFrame>
      <AvailabilityCalendar
        slots={MIXED_WEEK}
        viewerTimezone="Europe/Vienna"
        getSlotHref={demoGetSlotHref}
        onSelectSlot={() => {}}
      />
    </DockFrame>
  ),
};

export const SelectedConfirmFooter: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<IsoInstant | undefined>(
      "2026-09-21T10:00:00.000Z" as IsoInstant,
    );
    return (
      <DockFrame>
        <AvailabilityCalendar
          slots={UNIFORM_WEEK}
          viewerTimezone="Europe/Vienna"
          selectedStartUtc={selected}
          getSlotHref={demoGetSlotHref}
          onSelectSlot={(s) => setSelected(s.startUtc)}
        />
      </DockFrame>
    );
  },
};

export const OwnerReadOnlyPreview: Story = {
  render: () => (
    <DockFrame>
      <AvailabilityCalendar slots={UNIFORM_WEEK} viewerTimezone="Europe/Vienna" />
    </DockFrame>
  ),
};

function buildViennaFortnight() {
  return resolveSlots({
    rules: [viennaWeekdayRule],
    exceptions: noExceptions,
    existingBusyUtc: [],
    windowStartUtc: "2026-06-29T00:00:00Z",
    windowEndUtc: "2026-07-10T23:59:59Z",
    hostTimezone: "Europe/Vienna",
    viewerTimezone: "Europe/Vienna",
    policy: defaultBookingPolicy,
    nowUtc: "2026-06-22T00:00:00Z",
    priceRules: [],
    basePriceCents: basePrice5000,
  });
}

export const DaySwitching: Story = {
  render: () => {
    const slots = React.useMemo(buildViennaFortnight, []);
    return (
      <DockFrame>
        <AvailabilityCalendar
          slots={slots}
          viewerTimezone="Europe/Vienna"
          getSlotHref={demoGetSlotHref}
          onSelectSlot={() => {}}
        />
      </DockFrame>
    );
  },
};

const fallBackRule: AvailabilityRule = {
  hostTimezone: "Europe/Vienna",
  byWeekday: [0],
  startLocal: "01:30",
  endLocal: "04:00",
  slotDurationSeconds: 1800,
};

function buildFallBackWeek() {
  return resolveSlots({
    rules: [fallBackRule],
    exceptions: noExceptions,
    existingBusyUtc: [],
    windowStartUtc: "2026-10-24T23:00:00Z",
    windowEndUtc: "2026-10-25T23:00:00Z",
    hostTimezone: "Europe/Vienna",
    viewerTimezone: "Europe/Vienna",
    policy: defaultBookingPolicy,
    nowUtc: "2026-10-15T00:00:00Z",
    priceRules: [],
    basePriceCents: basePrice5000,
  });
}

export const FallBackDstDisambiguation: Story = {
  render: () => {
    const slots = React.useMemo(buildFallBackWeek, []);
    return (
      <DockFrame>
        <AvailabilityCalendar
          slots={slots}
          viewerTimezone="Europe/Vienna"
          getSlotHref={demoGetSlotHref}
          onSelectSlot={() => {}}
        />
      </DockFrame>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <DockFrame>
      <AvailabilityCalendar slots={[]} viewerTimezone="Europe/Vienna" />
    </DockFrame>
  ),
};
