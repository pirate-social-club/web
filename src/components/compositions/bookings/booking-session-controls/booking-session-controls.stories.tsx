import type { Meta, StoryObj } from "@storybook/react-vite";

import { BookingSessionControls } from "./booking-session-controls";

const meta = {
  title: "Compositions/Bookings/BookingSessionControls",
  component: BookingSessionControls,
  args: {
    counterpartyName: "Amira Hassan",
    onComplete: () => {},
    onLeave: () => {},
    onReviewAttendance: () => {},
    viewerRole: "host",
  },
  decorators: [
    (Story) => <div className="mx-auto w-full max-w-2xl p-4"><Story /></div>,
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BookingSessionControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InSession: Story = {
  args: { state: "in-session" },
};

export const AttendanceRetrying: Story = {
  args: { attendanceHealth: "retrying", state: "in-session" },
};

export const AttendanceDegraded: Story = {
  args: { attendanceHealth: "degraded", state: "in-session" },
};

export const HostAfterSession: Story = {
  args: { state: "ready-to-settle", viewerRole: "host" },
};

export const BookerAfterSession: Story = {
  args: { state: "ready-to-settle", viewerRole: "booker" },
};

export const CheckingAttendance: Story = {
  args: { state: "settling" },
};

export const OutcomeConfirmed: Story = {
  args: { state: "settled" },
};

export const MobileDegraded: Story = {
  args: { attendanceHealth: "degraded", state: "in-session" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const MobileAfterSession: Story = {
  args: { state: "ready-to-settle", viewerRole: "host" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
