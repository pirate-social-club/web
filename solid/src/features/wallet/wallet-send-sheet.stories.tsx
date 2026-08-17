/** @jsxImportSource @solidjs/web */

import { createEffect, createSignal } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { fiveChainSections, sharedWalletAddress } from "./wallet-flow-fixtures";
import { WalletSendSheet } from "./wallet-send-sheet";
import type { WalletSendSheetProps } from "./wallet-send-sheet.types";

const baseAssetId = "base:base-usdc";

const meta = {
  title: "Compositions/Wallet/WalletSendSheet",
  component: WalletSendSheet,
  args: {
    chainSections: fiveChainSections,
    defaultAssetId: baseAssetId,
    defaultRecipient: sharedWalletAddress,
    feeLabel: "~$0.01",
    onOpenChange: () => undefined,
    open: true,
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof WalletSendSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

function StoryRender(props: WalletSendSheetProps) {
  const [open, setOpen] = createSignal(props.open);
  createEffect(
    () => props.open,
    (nextOpen) => {
      setOpen(nextOpen);
    },
  );
  return (
    <div class="min-h-screen bg-background p-6">
      <WalletSendSheet {...props} onOpenChange={setOpen} open={open()} />
    </div>
  );
}

export const Step1AssetNetwork: Story = {
  args: { step: "asset" },
  render: (args) => <StoryRender {...args} />,
};

export const Step1Mobile: Story = {
  args: { forceMobile: true, step: "asset" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <StoryRender {...args} />,
};

export const Step2Recipient: Story = {
  args: { step: "recipient" },
  render: (args) => <StoryRender {...args} />,
};

export const Step2InvalidAddress: Story = {
  args: { defaultRecipient: "0x123", step: "recipient" },
  render: (args) => <StoryRender {...args} />,
};

export const Step3Amount: Story = {
  args: { amount: "100", step: "amount" },
  render: (args) => <StoryRender {...args} />,
};

export const Step3Insufficient: Story = {
  args: { amount: "900", step: "amount" },
  render: (args) => <StoryRender {...args} />,
};

export const Step4Review: Story = {
  args: { amount: "100", step: "review" },
  render: (args) => <StoryRender {...args} />,
};

export const Step4Mobile: Story = {
  args: { amount: "100", forceMobile: true, step: "review" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <StoryRender {...args} />,
};

export const Pending: Story = {
  args: { amount: "100", step: "pending" },
  render: (args) => <StoryRender {...args} />,
};

export const Success: Story = {
  args: { amount: "100", step: "success" },
  render: (args) => <StoryRender {...args} />,
};

export const Error: Story = {
  args: { amount: "100", step: "error" },
  render: (args) => <StoryRender {...args} />,
};

export const FullFlow: Story = {
  args: { defaultRecipient: "", step: "asset" },
  render: (args) => <StoryRender {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /USDC.*Base Sepolia/ }));
    await userEvent.type(canvas.getByPlaceholderText("0x..."), sharedWalletAddress);
    await userEvent.click(canvas.getByRole("button", { name: "Continue to amount" }));
    await userEvent.type(canvas.getByPlaceholderText("0.00"), "100");
    await userEvent.click(canvas.getByRole("button", { name: "Review" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirm send" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Submitting transaction");
  },
};
