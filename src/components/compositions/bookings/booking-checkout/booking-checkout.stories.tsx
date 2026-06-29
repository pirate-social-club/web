import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { makeQuotePreview } from "@pirate/bookings-domain/test";

import { BookingCheckout } from "../booking-checkout/booking-checkout";

const meta = {
  title: "Compositions/Bookings/BookingCheckout",
  component: BookingCheckout,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof BookingCheckout>;

export default meta;

type Story = StoryObj<typeof meta>;

const quote = makeQuotePreview({
  startUtc: "2026-07-01T07:00:00Z",
  priceCents: 5000,
  nowUtc: "2026-06-22T12:00:00Z",
});

export const Holding: Story = {
  render: () => (
    <BookingCheckout
      quote={quote}
      viewerTimezone="Europe/Vienna"
      phase="holding"
      holdExpiresAtUtc="2026-06-22T12:08:30Z"
      nowUtc="2026-06-22T12:00:00Z"
    />
  ),
};

export const HoldingLowTime: Story = {
  render: () => (
    <BookingCheckout
      quote={quote}
      viewerTimezone="Europe/Vienna"
      phase="holding"
      holdExpiresAtUtc="2026-06-22T12:00:45Z"
      nowUtc="2026-06-22T12:00:00Z"
    />
  ),
};

export const Pending: Story = {
  render: () => (
    <BookingCheckout
      quote={quote}
      viewerTimezone="Europe/Vienna"
      phase="pending"
      holdExpiresAtUtc="2026-06-22T12:10:00Z"
      nowUtc="2026-06-22T12:00:00Z"
    />
  ),
};

export const Conflict: Story = {
  render: () => (
    <BookingCheckout
      quote={quote}
      viewerTimezone="Europe/Vienna"
      phase="conflict"
      holdExpiresAtUtc="2026-06-22T12:10:00Z"
      nowUtc="2026-06-22T12:00:00Z"
    />
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="mx-auto max-w-sm">
      <BookingCheckout
        quote={quote}
        viewerTimezone="Europe/Vienna"
        phase="holding"
        holdExpiresAtUtc="2026-06-22T12:08:30Z"
        nowUtc="2026-06-22T12:00:00Z"
      />
    </div>
  ),
};
