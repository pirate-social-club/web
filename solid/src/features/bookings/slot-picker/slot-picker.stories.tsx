import type { Meta, StoryObj } from "storybook-solidjs-vite";

import type { ResolvedSlot } from "../view-models";
import { SlotPicker } from "./slot-picker";

const meta = {
  title: "App/Bookings/SlotPicker",
  component: SlotPicker,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SlotPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSlots: ResolvedSlot[] = [
  { startUtc: "2026-07-01T07:00:00Z", endUtc: "2026-07-01T07:30:00Z", priceCents: 6000, available: true },
  { startUtc: "2026-07-01T07:30:00Z", endUtc: "2026-07-01T08:00:00Z", priceCents: 6000, available: true },
  { startUtc: "2026-07-01T08:00:00Z", endUtc: "2026-07-01T08:30:00Z", priceCents: 5000, available: true },
  { startUtc: "2026-07-01T08:30:00Z", endUtc: "2026-07-01T09:00:00Z", priceCents: 5000, available: true },
];

const conflictSlots: ResolvedSlot[] = defaultSlots.map((slot, index) =>
  index === 1 ? { ...slot, available: false } : slot,
);

export const Default: Story = {
  render: () => (
    <SlotPicker slots={defaultSlots} viewerTimezone="Europe/Vienna" />
  ),
};

export const WithConflict: Story = {
  name: "With unavailable slot",
  render: () => (
    <SlotPicker slots={conflictSlots} viewerTimezone="Europe/Vienna" />
  ),
};

export const Empty: Story = {
  render: () => <SlotPicker slots={[]} viewerTimezone="Europe/Vienna" />,
};
