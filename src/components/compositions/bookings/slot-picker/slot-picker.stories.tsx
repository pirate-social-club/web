import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveSlots } from "@pirate/bookings-domain/test";
import {
  basePrice5000,
  defaultBookingPolicy,
  noExceptions,
  viennaWeekdayRule,
  weekdayPremiumPricing,
} from "@pirate/bookings-domain/test";

import { SlotPicker } from "../slot-picker/slot-picker";

const meta = {
  title: "Compositions/Bookings/SlotPicker",
  component: SlotPicker,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SlotPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

function buildOneDay() {
  return resolveSlots({
    rules: [viennaWeekdayRule],
    exceptions: noExceptions,
    existingBusyUtc: [],
    windowStartUtc: "2026-07-01T00:00:00Z",
    windowEndUtc: "2026-07-01T23:59:59Z",
    hostTimezone: "Europe/Vienna",
    viewerTimezone: "Europe/Vienna",
    policy: defaultBookingPolicy,
    nowUtc: "2026-06-22T00:00:00Z",
    priceRules: weekdayPremiumPricing,
    basePriceCents: basePrice5000,
  });
}

function buildWithConflict() {
  return resolveSlots({
    rules: [viennaWeekdayRule],
    exceptions: noExceptions,
    existingBusyUtc: [{ startUtc: "2026-07-01T07:30:00Z", endUtc: "2026-07-01T08:00:00Z" }],
    windowStartUtc: "2026-07-01T00:00:00Z",
    windowEndUtc: "2026-07-01T23:59:59Z",
    hostTimezone: "Europe/Vienna",
    viewerTimezone: "Europe/Vienna",
    policy: defaultBookingPolicy,
    nowUtc: "2026-06-22T00:00:00Z",
    priceRules: weekdayPremiumPricing,
    basePriceCents: basePrice5000,
  });
}

export const Default: Story = {
  render: () => {
    const slots = React.useMemo(buildOneDay, []);
    return <SlotPicker slots={slots} viewerTimezone="Europe/Vienna" />;
  },
};

export const WithConflict: Story = {
  render: () => {
    const slots = React.useMemo(buildWithConflict, []);
    return <SlotPicker slots={slots} viewerTimezone="Europe/Vienna" />;
  },
};

export const Empty: Story = {
  render: () => <SlotPicker slots={[]} viewerTimezone="Europe/Vienna" />,
};

export const Mobile: Story = {
  render: () => {
    const slots = React.useMemo(buildOneDay, []);
    return (
      <div className="mx-auto max-w-sm">
        <SlotPicker slots={slots} viewerTimezone="Europe/Vienna" />
      </div>
    );
  },
};
