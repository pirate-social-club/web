import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { RoyaltyClaimModalView, type RoyaltyClaimModalViewProps } from "../royalty-claim-modal";

const CLAIMABLE_WIP_WEI = "12450000000000000000";
const WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

const meta = {
  title: "Compositions/Wallet/Royalties/ClaimModal",
  component: RoyaltyClaimModalView,
  args: {
    autoUnwrapIpTokens: true,
    claimableCount: 3,
    claimState: { status: "idle" },
    onAutoUnwrapIpTokensChange: () => {},
    onClaim: () => {},
    onOpenChange: () => {},
    open: true,
    totalClaimableWipWei: CLAIMABLE_WIP_WEI,
    walletAddress: WALLET_ADDRESS,
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RoyaltyClaimModalView>;

export default meta;

type Story = StoryObj<typeof meta>;

function ModalStory(props: Partial<RoyaltyClaimModalViewProps>) {
  const [open, setOpen] = React.useState(true);
  const [autoUnwrapIpTokens, setAutoUnwrapIpTokens] = React.useState(props.autoUnwrapIpTokens ?? true);

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen claim</Button> : null}
      <RoyaltyClaimModalView
        autoUnwrapIpTokens={autoUnwrapIpTokens}
        claimableCount={props.claimableCount ?? 3}
        claimState={props.claimState ?? { status: "idle" }}
        forceMobile={props.forceMobile}
        loading={props.loading}
        onAutoUnwrapIpTokensChange={setAutoUnwrapIpTokens}
        onClaim={() => {}}
        onOpenChange={setOpen}
        open={open}
        totalClaimableWipWei={props.totalClaimableWipWei ?? CLAIMABLE_WIP_WEI}
        walletAddress={props.walletAddress ?? WALLET_ADDRESS}
      />
    </>
  );
}

export const Ready: Story = {
  name: "Ready to claim",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <ModalStory />,
};

export const NoWallet: Story = {
  name: "No wallet connected",
  render: () => <ModalStory walletAddress={null} />,
};

export const Signing: Story = {
  name: "Confirm in wallet",
  render: () => <ModalStory claimState={{ status: "signing" }} />,
};

export const Success: Story = {
  render: () => (
    <ModalStory
      claimState={{
        status: "success",
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      }}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ModalStory
      claimState={{
        status: "error",
        message: "User rejected the transaction request.",
      }}
    />
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ModalStory forceMobile />,
};
