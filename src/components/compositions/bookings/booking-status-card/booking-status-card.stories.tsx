import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { allBookingStates } from "@pirate/bookings-domain/test";

import { BookingStatusCard } from "../booking-status-card/booking-status-card";

const meta = {
  title: "Compositions/Bookings/BookingStatusCard",
  component: BookingStatusCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof BookingStatusCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseArgs = {
  hostName: "Amira Hassan",
  startUtc: "2026-07-01T07:00:00Z",
  endUtc: "2026-07-01T07:30:00Z",
  priceCents: 5000,
  viewerTimezone: "Europe/Vienna",
} satisfies React.ComponentProps<typeof BookingStatusCard>;

export const Confirmed: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="confirmed"
      canJoinSession
    />
  ),
};

export const ConfirmedJoinDisabled: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="confirmed"
      canJoinSession={false}
      joinDisabledReason="Session opens 5 minutes before start."
    />
  ),
};

export const Live: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="live"
      canJoinSession
    />
  ),
};

export const PendingPayment: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="pending_payment"
      canJoinSession={false}
    />
  ),
};

export const Completed: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="completed"
      canJoinSession={false}
    />
  ),
};

export const CancelledByHost: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="cancelled_by_host"
      canJoinSession={false}
    />
  ),
};

export const CancelledByBooker: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="cancelled_by_booker"
      canJoinSession={false}
    />
  ),
};

export const NoShowHost: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="no_show_host"
      canJoinSession={false}
    />
  ),
};

export const NoShowBooker: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="no_show_booker"
      canJoinSession={false}
    />
  ),
};

export const Refunded: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="refunded"
      canJoinSession={false}
    />
  ),
};

export const Disputed: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="disputed"
      canJoinSession={false}
    />
  ),
};

export const ExpiredHold: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="expired_hold"
      canJoinSession={false}
    />
  ),
};

export const CancelledBeforePayment: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="cancelled_before_payment"
      canJoinSession={false}
    />
  ),
};

export const Settled: Story = {
  render: () => (
    <BookingStatusCard
      {...baseArgs}
      state="settled"
      canJoinSession={false}
    />
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {allBookingStates.map((state) => (
        <div key={state} className="max-w-sm">
          <BookingStatusCard
            {...baseArgs}
            state={state}
            canJoinSession={state === "confirmed" || state === "live"}
          />
        </div>
      ))}
    </div>
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="mx-auto max-w-sm">
      <BookingStatusCard
        {...baseArgs}
        state="confirmed"
        canJoinSession
      />
    </div>
  ),
};
