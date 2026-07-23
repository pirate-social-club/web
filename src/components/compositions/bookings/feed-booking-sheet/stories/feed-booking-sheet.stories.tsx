import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/primitives/button";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { FeedBookingSheet } from "../feed-booking-sheet";

const meta = {
  title: "Compositions/Bookings/FeedBookingSheet",
  component: FeedBookingSheet,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FeedBookingSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const SLOTS: ResolvedSlot[] = [
  { startUtc: "2026-09-21T09:00:00.000Z", endUtc: "2026-09-21T09:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T10:00:00.000Z", endUtc: "2026-09-21T10:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T11:00:00.000Z", endUtc: "2026-09-21T11:30:00.000Z", priceCents: 3500, available: false },
  { startUtc: "2026-09-22T14:00:00.000Z", endUtc: "2026-09-22T14:30:00.000Z", priceCents: 5000, available: true },
] as ResolvedSlot[];

const BASE = {
  basePriceCents: 3500,
  handle: "mara.english",
  onSelectSlot: () => {},
  slots: SLOTS,
  viewerTimezone: "Europe/Vienna" as never,
};

/** Opens closed so the story exercises the real trigger → open → dismiss path. */
function ControlledSheet(props: Partial<React.ComponentProps<typeof FeedBookingSheet>>) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex h-dvh items-center justify-center bg-surface-skeleton">
      <Button onClick={() => setOpen(true)} type="button">Book</Button>
      <FeedBookingSheet {...BASE} {...props} onOpenChange={setOpen} open={open} />
    </div>
  );
}

export const Desktop: Story = {
  args: { ...BASE, onOpenChange: () => {}, open: true },
  render: () => <ControlledSheet />,
};

export const Mobile: Story = {
  args: { ...BASE, onOpenChange: () => {}, open: true },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <ControlledSheet />,
};

export const Loading: Story = {
  args: { ...BASE, onOpenChange: () => {}, open: true },
  render: () => <ControlledSheet loading slots={[]} />,
};

export const NoAvailability: Story = {
  args: { ...BASE, onOpenChange: () => {}, open: true },
  render: () => <ControlledSheet slots={[]} />,
};

export const AvailabilityError: Story = {
  args: { ...BASE, onOpenChange: () => {}, open: true },
  render: () => <ControlledSheet error onRetry={() => {}} slots={[]} />,
};
