import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { makeQuotePreview } from "@pirate/bookings-domain/test";

import { BookingSummary } from "../booking-summary/booking-summary";

const meta = {
  title: "Compositions/Bookings/BookingSummary",
  component: BookingSummary,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof BookingSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <BookingSummary
      quote={makeQuotePreview({ startUtc: "2026-07-01T07:00:00Z", priceCents: 5000 })}
      viewerTimezone="Europe/Vienna"
    />
  ),
};

export const VariablePrice: Story = {
  render: () => (
    <BookingSummary
      quote={makeQuotePreview({ startUtc: "2026-07-01T07:00:00Z", priceCents: 6000 })}
      viewerTimezone="Europe/Vienna"
    />
  ),
};

export const OddAmount: Story = {
  render: () => (
    <BookingSummary
      quote={makeQuotePreview({ startUtc: "2026-07-01T07:00:00Z", priceCents: 3333 })}
      viewerTimezone="Europe/Vienna"
    />
  ),
};

export const ViewerInNewYork: Story = {
  render: () => (
    <BookingSummary
      quote={makeQuotePreview({ startUtc: "2026-07-01T07:00:00Z", priceCents: 5000 })}
      viewerTimezone="America/New_York"
    />
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="mx-auto max-w-sm">
      <BookingSummary
        quote={makeQuotePreview({ startUtc: "2026-07-01T07:00:00Z", priceCents: 5000 })}
        viewerTimezone="Europe/Vienna"
      />
    </div>
  ),
};
