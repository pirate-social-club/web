import type { Meta, StoryObj } from "@storybook/react-vite";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { RewardWalletAssets, type RewardHolding } from "../reward-wallet-assets";

const meta = {
  title: "Compositions/Bounties/Wallet Assets",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function Frame({ holdings }: { holdings: RewardHolding[] }) {
  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto w-full max-w-2xl py-8">
        <RewardWalletAssets holdings={holdings} />
      </div>
    </StandardRoutePage>
  );
}

const groupedHoldings: RewardHolding[] = [
  {
    actionLabel: "Claim",
    amountLabel: "12.40 USDC",
    assetLabel: "USDC on Base",
    id: "usdc",
    kind: "fungible",
    onAction: noop,
    state: "ready",
  },
  {
    actionLabel: "Claim",
    amountLabel: "25 $COMMUNITY",
    assetLabel: "Community reward token",
    id: "community",
    kind: "fungible",
    onAction: noop,
    state: "ready",
  },
  {
    drawingLabel: "Drawing 141",
    id: "ticket-1042",
    kind: "megapot_ticket",
    onAction: noop,
    state: "delivered",
    ticketLabel: "Megapot ticket #1042",
  },
];

export const GroupedByAsset: Story = {
  render: () => <Frame holdings={groupedHoldings} />,
};

export const WinningTicket: Story = {
  render: () => (
    <Frame
      holdings={[
        ...groupedHoldings.slice(0, 2),
        {
          drawingLabel: "Drawing 140",
          id: "ticket-1099",
          kind: "megapot_ticket",
          onAction: noop,
          state: "winner",
          ticketLabel: "Megapot ticket #1099",
          winningsLabel: "5.00 USDC",
        },
      ]}
    />
  ),
};

export const WinningAmountPending: Story = {
  render: () => (
    <Frame
      holdings={[{
        drawingLabel: "Drawing 140",
        id: "ticket-1099",
        kind: "megapot_ticket",
        onAction: noop,
        state: "winner",
        ticketLabel: "Megapot ticket #1099",
      }]}
    />
  ),
};

export const LosingTicket: Story = {
  render: () => (
    <Frame
      holdings={[{
        drawingLabel: "Drawing 139",
        id: "ticket-1001",
        kind: "megapot_ticket",
        state: "no_win",
        ticketLabel: "Megapot ticket #1001",
      }]}
    />
  ),
};

export const ClaimsInProgress: Story = {
  render: () => (
    <Frame
      holdings={[
        {
          actionLabel: "Claiming",
          amountLabel: "12.40 USDC",
          assetLabel: "USDC on Base",
          id: "usdc",
          kind: "fungible",
          onAction: noop,
          state: "pending",
          supportingLabel: "Transfer submitted",
        },
        {
          drawingLabel: "Drawing 140",
          id: "ticket-1099",
          kind: "megapot_ticket",
          onAction: noop,
          state: "claiming",
          ticketLabel: "Megapot ticket #1099",
          winningsLabel: "5.00 USDC",
        },
      ]}
    />
  ),
};

export const LongCommunityToken: Story = {
  render: () => (
    <Frame
      holdings={[
        {
          actionLabel: "Claim",
          amountLabel: "25.123456789012345678 $INTERNATIONALCOMMUNITYTOKEN",
          assetLabel: "Community reward token",
          id: "long-community-token",
          kind: "fungible",
          onAction: noop,
          state: "ready",
        },
      ]}
    />
  ),
};

export const Empty: Story = {
  render: () => <Frame holdings={[]} />,
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <Frame holdings={groupedHoldings} />,
};
