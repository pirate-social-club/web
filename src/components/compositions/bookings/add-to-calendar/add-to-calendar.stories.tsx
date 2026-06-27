import type { Meta, StoryObj } from "@storybook/react-vite";

import { AddToCalendar } from "../add-to-calendar/add-to-calendar";

const meta = {
  title: "Compositions/Bookings/AddToCalendar",
  component: AddToCalendar,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AddToCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AddToCalendar
      bookingTitle="English Conversation Practice"
      hostName="Amira Hassan"
      startUtc="2026-07-01T07:00:00Z"
      endUtc="2026-07-01T07:30:00Z"
      viewerTimezone="Europe/Vienna"
    />
  ),
};

export const HourLong: Story = {
  render: () => (
    <AddToCalendar
      bookingTitle="Business English Deep Dive"
      hostName="Marcus Chen"
      startUtc="2026-07-02T14:00:00Z"
      endUtc="2026-07-02T15:00:00Z"
      viewerTimezone="America/New_York"
    />
  ),
};
