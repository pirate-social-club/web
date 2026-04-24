import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { SongPurchaseModal } from "../song-purchase-modal";

const meta = {
  title: "Compositions/SongPurchaseModal",
  component: SongPurchaseModal,
  args: {
    fundingAssetLabel: "USDC on Base Sepolia",
    onConfirm: () => {},
    onOpenChange: () => {},
    onSelfVerificationClick: () => {},
    open: true,
    priceLabel: "$3.99",
    processing: false,
    selfVerificationSavingsPercent: 20,
    songTitle: "Midnight Waves",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongPurchaseModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function ModalStory({
  error = null,
  forceMobile = false,
  processing = false,
  showSelfVerificationNudge = true,
}: {
  error?: string | null;
  forceMobile?: boolean;
  processing?: boolean;
  showSelfVerificationNudge?: boolean;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen purchase</Button> : null}
      <SongPurchaseModal
        error={error}
        forceMobile={forceMobile}
        fundingAssetLabel="USDC on Base Sepolia"
        onConfirm={() => {}}
        onOpenChange={setOpen}
        onSelfVerificationClick={() => {}}
        open={open}
        priceLabel="$3.99"
        processing={processing}
        selfVerificationSavingsPercent={showSelfVerificationNudge ? 20 : null}
        songTitle="Midnight Waves"
      />
    </>
  );
}

export const Desktop: Story = {
  name: "Desktop / Confirm purchase",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <ModalStory />,
};

export const Mobile: Story = {
  name: "Mobile / Confirm purchase",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ModalStory forceMobile />,
};

export const Processing: Story = {
  name: "Desktop / Processing",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <ModalStory processing />,
};

export const Verified: Story = {
  name: "Desktop / Verified price",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <ModalStory showSelfVerificationNudge={false} />,
};

export const Error: Story = {
  name: "Desktop / Error",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <ModalStory error="Checkout transaction was rejected." />,
};
