import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  cancelledBookings,
  pastBookings,
  upcomingBookings,
} from "@pirate/bookings-domain/test";
import type { BookingListItem } from "../bookings-list/bookings-list";

import { BookingsList } from "../bookings-list/bookings-list";

const meta = {
  title: "Compositions/Bookings/BookingsList",
  component: BookingsList,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof BookingsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Upcoming: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <BookingsList
        items={upcomingBookings as BookingListItem[]}
        viewerTimezone="Europe/Vienna"
      />
    </div>
  ),
};

export const Past: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <BookingsList
        items={pastBookings as BookingListItem[]}
        viewerTimezone="Europe/Vienna"
      />
    </div>
  ),
};

export const Cancelled: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <BookingsList
        items={cancelledBookings as BookingListItem[]}
        viewerTimezone="Europe/Vienna"
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl p-4">
      <BookingsList items={[]} viewerTimezone="Europe/Vienna" />
    </div>
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="mx-auto max-w-sm p-4">
      <BookingsList
        items={upcomingBookings as BookingListItem[]}
        viewerTimezone="Europe/Vienna"
      />
    </div>
  ),
};
