import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { fiveChainSections, sharedWalletAddress } from "../../stories/wallet-flow-fixtures";
import { WalletReceiveSheet } from "../wallet-receive-sheet";

const meta = {
  title: "Compositions/Wallet/WalletReceiveSheet",
  component: WalletReceiveSheet,
  args: {
    chainSections: fiveChainSections,
    defaultChainId: "tempo",
    onOpenChange: () => undefined,
    open: true,
    walletAddress: sharedWalletAddress,
  },
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => {
    const [open, setOpen] = React.useState(args.open);
    React.useEffect(() => setOpen(args.open), [args.open]);

    return (
      <div className="min-h-screen bg-background p-6">
        <WalletReceiveSheet {...args} onOpenChange={setOpen} open={open} />
      </div>
    );
  },
} satisfies Meta<typeof WalletReceiveSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultDesktop: Story = {};

export const DefaultMobile: Story = {
  args: {
    forceMobile: true,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const ChainSwitched: Story = {
  args: {
    defaultChainId: "story",
  },
};

export const AllChainsSameAddress: Story = {
  args: {
    defaultChainId: "base",
  },
};

export const EmptyNoWallet: Story = {
  args: {
    chainSections: fiveChainSections.map((section) => ({ ...section, walletAddress: null })),
    walletAddress: null,
  },
};
