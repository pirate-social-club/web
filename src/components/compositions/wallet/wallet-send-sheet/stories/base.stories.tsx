import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { fiveChainSections, sharedWalletAddress } from "../../stories/wallet-flow-fixtures";
import { WalletSendSheet } from "../wallet-send-sheet";

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
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => {
    const [open, setOpen] = React.useState(args.open);
    React.useEffect(() => setOpen(args.open), [args.open]);

    return (
      <div className="min-h-screen bg-background p-6">
        <WalletSendSheet {...args} onOpenChange={setOpen} open={open} />
      </div>
    );
  },
} satisfies Meta<typeof WalletSendSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Step1AssetNetwork: Story = {
  args: {
    step: "asset",
  },
};

export const Step1Mobile: Story = {
  args: {
    forceMobile: true,
    step: "asset",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const Step2Recipient: Story = {
  args: {
    step: "recipient",
  },
};

export const Step2InvalidAddress: Story = {
  args: {
    defaultRecipient: "0x123",
    step: "recipient",
  },
};

export const Step3Amount: Story = {
  args: {
    amount: "100",
    step: "amount",
  },
};

export const Step3Insufficient: Story = {
  args: {
    amount: "900",
    step: "amount",
  },
};

export const Step4Review: Story = {
  args: {
    amount: "100",
    step: "review",
  },
};

export const Step4Mobile: Story = {
  args: {
    amount: "100",
    forceMobile: true,
    step: "review",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const Pending: Story = {
  args: {
    amount: "100",
    step: "pending",
  },
};

export const Success: Story = {
  args: {
    amount: "100",
    step: "success",
  },
};

export const Error: Story = {
  args: {
    amount: "100",
    step: "error",
  },
};

export const FullFlow: Story = {
  args: {
    defaultRecipient: "",
    step: "asset",
  },
};
