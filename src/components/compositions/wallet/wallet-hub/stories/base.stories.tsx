import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { StorybookMobileDefaultRoute } from "@/components/compositions/app/page-shell/storybook-helpers";
import { fiveChainSections, sharedWalletAddress } from "../../stories/wallet-flow-fixtures";
import { WalletReceiveSheet } from "../../wallet-receive-sheet/wallet-receive-sheet";
import { WalletSendSheet } from "../../wallet-send-sheet/wallet-send-sheet";
import { WalletHub } from "../wallet-hub";
import type { WalletHubProps } from "../wallet-hub.types";

const baseArgs: WalletHubProps = {
  claimableWipWei: "12450000000000000000",
  claimableSalesCount: 2,
  walletLabel: "View your money and recent activity.",
  walletAddress: sharedWalletAddress,
  totalBalanceUsd: "$27,910.97",
  onReceive: () => alert("Receive clicked"),
  onSend: () => alert("Send clicked"),
  onViewActivity: () => alert("Activity clicked"),
  recentActivity: [
    { id: "act-1", title: "Midnight Waves sold", amount: "+$6.20 WIP", timestamp: "6m" },
    { id: "act-2", title: "Basement Session sold", amount: "+$4.00 WIP", timestamp: "48m" },
    { id: "act-3", title: "Claim confirmed", amount: "$10.20 WIP", timestamp: "1h" },
  ],
  chainSections: fiveChainSections,
};

const meta = {
  title: "Compositions/Wallet/WalletHub",
  component: WalletHub,
  args: baseArgs,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof WalletHub>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <StandardRoutePage size="rail">
      <WalletHub {...args} />
    </StandardRoutePage>
  ),
};

export const Deferred: Story = {
  args: {
    walletLabel: "View your money and recent activity.",
    recentActivity: [
      { id: "act-1", title: "Midnight Waves sold", amount: "+$6.20 WIP", timestamp: "6m" },
    ],
    chainSections: [
      {
        chainId: "ethereum",
        title: "Ethereum",
        availability: "ready",
        tokens: [
          { id: "eth", symbol: "ETH", name: "Ether", balance: "0.82" },
          { id: "usdc-eth", symbol: "USDC", name: "USD Coin", balance: "96.00" },
        ],
      },
      {
        chainId: "base",
        title: "Base",
        availability: "ready",
        tokens: [],
      },
      {
        chainId: "optimism",
        title: "Optimism",
        availability: "ready",
        tokens: [],
      },
      {
        chainId: "story",
        title: "Story",
        availability: "ready",
        tokens: [
          { id: "ip", symbol: "IP", name: "Story Protocol", balance: "12.80" },
        ],
      },
      {
        chainId: "tempo",
        title: "Tempo",
        availability: "later",
        tokens: [],
        note: "Coming soon",
      },
    ],
  },
  render: (args) => (
    <StandardRoutePage size="rail">
      <WalletHub {...args} />
    </StandardRoutePage>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: (args) => (
    <StorybookMobileDefaultRoute size="rail">
      <WalletHub {...args} />
    </StorybookMobileDefaultRoute>
  ),
};

function WalletHubWithSheets({ forceMobile = false }: { forceMobile?: boolean }) {
  const [walletAction, setWalletAction] = React.useState<"send" | "receive" | null>(null);

  return (
    <StandardRoutePage size="rail">
      <WalletHub
        {...baseArgs}
        onReceive={() => setWalletAction("receive")}
        onSend={() => setWalletAction("send")}
      />
      <WalletReceiveSheet
        chainSections={fiveChainSections}
        defaultChainId="tempo"
        forceMobile={forceMobile}
        onOpenChange={(open) => setWalletAction(open ? "receive" : null)}
        open={walletAction === "receive"}
        walletAddress={sharedWalletAddress}
      />
      <WalletSendSheet
        chainSections={fiveChainSections}
        defaultAssetId="base:base-usdc"
        forceMobile={forceMobile}
        onOpenChange={(open) => setWalletAction(open ? "send" : null)}
        open={walletAction === "send"}
      />
    </StandardRoutePage>
  );
}

function WalletHubWithSheetsMobile({ forceMobile = false }: { forceMobile?: boolean }) {
  const [walletAction, setWalletAction] = React.useState<"send" | "receive" | null>(null);

  return (
    <StorybookMobileDefaultRoute size="rail">
      <WalletHub
        {...baseArgs}
        onReceive={() => setWalletAction("receive")}
        onSend={() => setWalletAction("send")}
      />
      <WalletReceiveSheet
        chainSections={fiveChainSections}
        defaultChainId="tempo"
        forceMobile={forceMobile}
        onOpenChange={(open) => setWalletAction(open ? "receive" : null)}
        open={walletAction === "receive"}
        walletAddress={sharedWalletAddress}
      />
      <WalletSendSheet
        chainSections={fiveChainSections}
        defaultAssetId="base:base-usdc"
        forceMobile={forceMobile}
        onOpenChange={(open) => setWalletAction(open ? "send" : null)}
        open={walletAction === "send"}
      />
    </StorybookMobileDefaultRoute>
  );
}

export const WithSendReceiveSheets: Story = {
  render: () => <WalletHubWithSheets />,
};

export const WithSheetsMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <WalletHubWithSheetsMobile forceMobile />,
};
