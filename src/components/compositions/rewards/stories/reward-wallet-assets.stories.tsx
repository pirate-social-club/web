import type { Meta, StoryObj } from "@storybook/react-vite";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import {
  RewardWalletAssets,
  type RewardHolding,
  type TicketPoolWinningsCredit,
} from "../reward-wallet-assets";

const meta = {
  title: "Compositions/Bounties/Wallet Assets",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function Frame({
  holdings,
  poolCredits = [],
}: {
  holdings: RewardHolding[];
  poolCredits?: TicketPoolWinningsCredit[];
}) {
  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto w-full max-w-2xl py-8">
        <RewardWalletAssets holdings={holdings} poolCredits={poolCredits} />
      </div>
    </StandardRoutePage>
  );
}

const groupedHoldings: RewardHolding[] = [
  {
    actionLabel: "Cash out USDC",
    amountLabel: "12.403333 USDC",
    assetLabel: "USDC on Base",
    id: "usdc",
    kind: "fungible",
    onAction: noop,
    state: "ready",
  },
  {
    actionLabel: "Cash out $COMMUNITY",
    amountLabel: "25 $COMMUNITY",
    assetLabel: "Community reward token",
    id: "community",
    kind: "fungible",
    onAction: noop,
    state: "ready",
  },
];

const creditedPoolWin: TicketPoolWinningsCredit = {
  allocationLabel: "Equal allocation · 3,333 atomic USDC",
  amountLabel: "0.003333 USDC",
  drawingLabel: "Drawing 7,709",
  id: "pool-credit-7709",
  songLabel: "Under-sung song",
  state: "credited",
};

export const GroupedByAsset: Story = {
  render: () => <Frame holdings={groupedHoldings} />,
};

export const PoolWinningsCredited: Story = {
  render: () => <Frame holdings={groupedHoldings} poolCredits={[creditedPoolWin]} />,
};

export const SubCentPoolCredit: Story = {
  render: () => (
    <Frame
      holdings={[groupedHoldings[0]]}
      poolCredits={[creditedPoolWin]}
    />
  ),
};

export const CustodyClaimPending: Story = {
  render: () => (
    <Frame
      holdings={[groupedHoldings[0]]}
      poolCredits={[{
        allocationLabel: "Equal allocation across 12 committed singers",
        amountLabel: "5.00 USDC gross",
        drawingLabel: "Drawing 7,710",
        id: "pool-credit-pending",
        songLabel: "Under-sung song",
        state: "claim_pending",
      }]}
    />
  ),
};

export const PoolAllocationNeedsReview: Story = {
  render: () => (
    <Frame
      holdings={groupedHoldings}
      poolCredits={[{
        allocationLabel: "Committed beneficiary set · credit not posted",
        drawingLabel: "Drawing 7,710",
        id: "pool-credit-review",
        songLabel: "Under-sung song",
        state: "needs_review",
      }]}
    />
  ),
};

export const CashoutInProgress: Story = {
  render: () => (
    <Frame
      holdings={[
        {
          actionLabel: "Cashing out",
          amountLabel: "12.403333 USDC",
          assetLabel: "USDC on Base",
          id: "usdc",
          kind: "fungible",
          onAction: noop,
          state: "pending",
          supportingLabel: "Transfer submitted",
        },
        groupedHoldings[1],
      ]}
    />
  ),
};

export const LongCommunityToken: Story = {
  render: () => (
    <Frame
      holdings={[
        {
          actionLabel: "Cash out",
          amountLabel: "25.123456789012345678 $INTERNATIONALCOMMUNITYTOKEN",
          assetLabel: "Community reward token · not admitted",
          id: "long-community-token",
          kind: "fungible",
          onAction: noop,
          state: "needs_review",
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
  render: () => <Frame holdings={groupedHoldings} poolCredits={[creditedPoolWin]} />,
};
