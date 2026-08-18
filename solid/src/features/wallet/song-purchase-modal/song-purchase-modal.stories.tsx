/** @jsxImportSource @solidjs/web */

import { createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button } from "../../../design-system";
import { SongPurchaseModal } from "./song-purchase-modal";
import type { SongPurchaseModalProps } from "./song-purchase-modal.types";

const baseArgs: SongPurchaseModalProps = {
  fundingAssetLabel: "USDC on Base Sepolia",
  onConfirm: () => undefined,
  onOpenChange: () => undefined,
  onSelfVerificationClick: () => undefined,
  open: true,
  priceLabel: "$3.99",
  selfVerificationSavingsPercent: 20,
  songTitle: "Midnight Waves",
};

const meta = {
  title: "Compositions/Wallet/SongPurchaseModal",
  component: SongPurchaseModal,
  args: baseArgs,
  parameters: { a11y: { test: "error" } },
  decorators: [(Story) => <div class="min-h-[720px] bg-background p-6 text-foreground"><Story /></div>],
} satisfies Meta<typeof SongPurchaseModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalStory(props: Partial<SongPurchaseModalProps>) {
  const [open, setOpen] = createSignal(true);
  return (
    <>
      {!open() ? <Button onClick={() => setOpen(true)}>Reopen purchase</Button> : null}
      <SongPurchaseModal
        {...baseArgs}
        {...props}
        onOpenChange={setOpen}
        open={open()}
      />
    </>
  );
}

export const Desktop: Story = {
  name: "Desktop / Confirm purchase",
  args: { onConfirm: fn() },
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: (args) => <ModalStory {...args} state="desktop" />,
  play: async ({ args, canvasElement }) => {
    const confirm = within(canvasElement).getByRole("button", { name: "Unlock for $3.99" });
    await expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalled();
  },
};

export const Mobile: Story = {
  name: "Mobile / Confirm purchase",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <ModalStory state="mobile" />,
};

export const Processing: Story = {
  name: "Desktop / Processing",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => <ModalStory state="processing" />,
};

export const Verified: Story = {
  name: "Desktop / Verified price",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => <ModalStory priceLabel="$3.19" state="verified" />,
};

export const VinylAvailable: Story = {
  name: "Desktop / Vinyl available",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => <ModalStory state="vinyl-available" />,
};

export const Error: Story = {
  name: "Desktop / Error",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => <ModalStory state="error" />,
};
