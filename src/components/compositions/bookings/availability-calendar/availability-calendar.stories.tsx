import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveSlots } from "@pirate/bookings-domain/test";
import {
  basePrice5000,
  defaultBookingPolicy,
  noExceptions,
  viennaWeekdayRule,
  weekdayPremiumPricing,
  type AvailabilityRule,
} from "@pirate/bookings-domain/test";

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

function buildViennaWeek() {
  return resolveSlots({
    rules: [viennaWeekdayRule],
    exceptions: noExceptions,
    existingBusyUtc: [],
    windowStartUtc: "2026-06-29T00:00:00Z",
    windowEndUtc: "2026-07-03T23:59:59Z",
    hostTimezone: "Europe/Vienna",
    viewerTimezone: "Europe/Vienna",
    policy: defaultBookingPolicy,
    nowUtc: "2026-06-22T00:00:00Z",
    priceRules: weekdayPremiumPricing,
    basePriceCents: basePrice5000,
  });
}

function buildViennaWeekViewerNY() {
  return resolveSlots({
    rules: [viennaWeekdayRule],
    exceptions: noExceptions,
    existingBusyUtc: [],
    windowStartUtc: "2026-06-29T00:00:00Z",
    windowEndUtc: "2026-07-03T23:59:59Z",
    hostTimezone: "Europe/Vienna",
    viewerTimezone: "America/New_York",
    policy: defaultBookingPolicy,
    nowUtc: "2026-06-22T00:00:00Z",
    priceRules: weekdayPremiumPricing,
    basePriceCents: basePrice5000,
  });
}

export const PopulatedWeek: Story = {
  render: () => {
    const slots = React.useMemo(buildViennaWeek, []);
    return (
      <div className="mx-auto max-w-2xl p-4">
        <AvailabilityCalendar slots={slots} viewerTimezone="Europe/Vienna" />
      </div>
    );
  },
};

export const VariablePricing: Story = {
  render: () => {
    const slots = React.useMemo(buildViennaWeek, []);
    return (
      <div className="mx-auto max-w-2xl p-4">
        <AvailabilityCalendar slots={slots} viewerTimezone="Europe/Vienna" />
      </div>
    );
  },
};

export const ViewerInNewYork: Story = {
  render: () => {
    const slots = React.useMemo(buildViennaWeekViewerNY, []);
    return (
      <div className="mx-auto max-w-2xl p-4">
        <AvailabilityCalendar slots={slots} viewerTimezone="America/New_York" />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <AvailabilityCalendar slots={[]} viewerTimezone="Europe/Vienna" />
    </div>
  ),
};

export const Mobile: Story = {
  render: () => {
    const slots = React.useMemo(buildViennaWeek, []);
    return (
      <div className="mx-auto max-w-sm p-4">
        <AvailabilityCalendar slots={slots} viewerTimezone="Europe/Vienna" />
      </div>
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
      <div className="mx-auto max-w-2xl p-4">
        <AvailabilityCalendar slots={slots} viewerTimezone="Europe/Vienna" />
      </div>
    );
  },
};
