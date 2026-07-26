import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { ProfileBookPanel } from "../profile-book-panel";

const meta = {
  title: "Compositions/Bookings/ProfileBookPanel",
  component: ProfileBookPanel,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProfileBookPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const SLOTS: ResolvedSlot[] = [
  { startUtc: "2026-09-21T09:00:00.000Z", endUtc: "2026-09-21T09:30:00.000Z", priceCents: 5000, available: true },
  { startUtc: "2026-09-21T10:00:00.000Z", endUtc: "2026-09-21T10:30:00.000Z", priceCents: 5000, available: true },
  { startUtc: "2026-09-22T14:00:00.000Z", endUtc: "2026-09-22T14:30:00.000Z", priceCents: 7500, available: true },
] as ResolvedSlot[];

export const OwnerNotConfigured: Story = {
  args: { mode: "owner", configured: false, basePriceCents: 0, slots: [], viewerTimezone: "Europe/Vienna" as never, onEdit: () => {} },
};

export const OwnerConfigured: Story = {
  args: { mode: "owner", configured: true, basePriceCents: 5000, slots: SLOTS, viewerTimezone: "Europe/Vienna" as never, onEdit: () => {} },
};

export const ViewerWithAvailability: Story = {
  args: { mode: "viewer", startingPriceCents: 5000, slots: SLOTS, viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} },
};

export const ViewerNoAvailability: Story = {
  args: { mode: "viewer", startingPriceCents: 5000, slots: [], viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { mode: "viewer", startingPriceCents: 5000, slots: SLOTS, viewerTimezone: "Europe/Vienna" as never, onSelectSlot: () => {} },
};
