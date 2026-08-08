import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/primitives/button";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";
import { FeedPanelLayout, FeedSidePanel } from "@/components/compositions/posts/feed-side-panel/feed-side-panel";
import { FeedBookingSheetBody } from "../feed-booking-sheet";

const meta = {
  title: "Compositions/Bookings/FeedBookingPanel",
  component: FeedBookingSheetBody,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FeedBookingSheetBody>;

export default meta;
type Story = StoryObj<typeof meta>;

const SLOTS: ResolvedSlot[] = [
  { startUtc: "2026-09-21T09:00:00.000Z", endUtc: "2026-09-21T09:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T10:00:00.000Z", endUtc: "2026-09-21T10:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T11:00:00.000Z", endUtc: "2026-09-21T11:30:00.000Z", priceCents: 3500, available: false },
  { startUtc: "2026-09-22T14:00:00.000Z", endUtc: "2026-09-22T14:30:00.000Z", priceCents: 5000, available: true },
] as ResolvedSlot[];

/** Four uniform days — enough to exercise the day strip, internal list scroll, and confirm footer. */
const SLOTS_LONG: ResolvedSlot[] = [21, 22, 23, 24].flatMap((day) =>
  [9, 10, 11, 14, 15, 16, 17].map((hour) => ({
    startUtc: `2026-09-${day}T${String(hour).padStart(2, "0")}:00:00.000Z`,
    endUtc: `2026-09-${day}T${String(hour).padStart(2, "0")}:30:00.000Z`,
    priceCents: 5000,
    available: true,
  })),
) as ResolvedSlot[];

const BASE = {
  startingPriceCents: 3500,
  onSelectSlot: () => {},
  slots: SLOTS,
  viewerTimezone: "Europe/Vienna" as never,
};

/** Opens closed so the story exercises the shared trigger → dock/sheet → dismiss path. */
function ControlledPanel(props: Partial<React.ComponentProps<typeof FeedBookingSheetBody>>) {
  const [open, setOpen] = React.useState(false);
  return (
    <FeedPanelLayout
      className="h-dvh bg-surface-skeleton"
      panel={open ? (
        <FeedSidePanel closeLabel="Close" description="Choose an available time." onOpenChange={setOpen} open title="Book mara.english">
          <div className="h-full overflow-y-auto p-5">
            <FeedBookingSheetBody {...BASE} {...props} />
          </div>
        </FeedSidePanel>
      ) : undefined}
    >
      <div className="grid h-full place-items-center">
        <Button onClick={() => setOpen(true)} type="button">Book</Button>
      </div>
    </FeedPanelLayout>
  );
}

export const Desktop: Story = {
  args: BASE,
  render: () => <ControlledPanel />,
};

export const Mobile: Story = {
  args: BASE,
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <ControlledPanel />,
};

export const LongAvailability: Story = {
  args: { ...BASE, slots: SLOTS_LONG, startingPriceCents: 5000 },
  render: () => <ControlledPanel slots={SLOTS_LONG} startingPriceCents={5000} />,
};

export const Loading: Story = {
  args: BASE,
  render: () => <ControlledPanel loading slots={[]} />,
};

export const NoAvailability: Story = {
  args: BASE,
  render: () => <ControlledPanel slots={[]} />,
};

export const AvailabilityError: Story = {
  args: BASE,
  render: () => <ControlledPanel error onRetry={() => {}} slots={[]} />,
};
