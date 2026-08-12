import type { Meta, StoryObj } from "@storybook/react-vite";

import { SongBountiesSheet } from "../song-bounties-sheet";

const meta = {
  title: "Compositions/Bounties/Slots",
  component: SongBountiesSheet,
  args: {
    capabilities: { canCreate: true, canFund: true },
    open: true,
    slots: [],
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SongBountiesSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const action = () => undefined;

export const EmptySlots: Story = {
  args: {
    onSlotAction: action,
  },
};

export const CashAndCash: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        remainingLabel: "$8.20 USDC remaining",
        rewardLabel: "$0.40 USDC",
        status: "active",
      },
      {
        objective: "karaoke",
        remainingLabel: "$14.00 USDC remaining",
        rewardLabel: "$1.00 USDC",
        status: "active",
      },
    ],
  },
};

export const CashAndMegapot: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        remainingLabel: "$8.20 USDC remaining",
        rewardLabel: "$0.40 USDC",
        status: "active",
      },
      {
        objective: "karaoke",
        remainingLabel: "About 12 rewards remaining",
        rewardLabel: "1 Megapot ticket · current jackpot $1.1M USDC",
        status: "active",
      },
    ],
  },
};

export const ExhaustedTopUpOnly: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        rewardLabel: "$0.40 USDC",
        status: "exhausted",
      },
      {
        objective: "karaoke",
        remainingLabel: "$14.00 USDC remaining",
        rewardLabel: "$1.00 USDC",
        status: "active",
      },
    ],
  },
};

export const OccupiedNotPayable: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        rewardLabel: "25 $COMMUNITY",
        status: "funding_confirming",
      },
      {
        objective: "karaoke",
        rewardLabel: "1 Megapot ticket",
        status: "operational_hold",
      },
    ],
  },
};

export const MegapotPriceUnavailable: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        remainingLabel: "$8.20 USDC remaining",
        rewardLabel: "$0.40 USDC",
        status: "active",
      },
      {
        objective: "karaoke",
        claimsPausedReason: "price_stale",
        rewardLabel: "1 Megapot ticket",
        status: "active",
      },
    ],
  },
};

export const ExhaustedAndPriceUnavailable: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        claimsPausedReason: "price_stale",
        objective: "karaoke",
        rewardLabel: "1 Megapot ticket",
        status: "exhausted",
      },
    ],
  },
};

export const MegapotPriceAboveLimit: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        rewardLabel: "25 $COMMUNITY",
        remainingLabel: "2,500 $COMMUNITY remaining",
        status: "active",
      },
      {
        objective: "karaoke",
        claimsPausedReason: "price_ceiling",
        priceCeilingLabel: "$1.10 USDC limit",
        rewardLabel: "1 Megapot ticket",
        status: "active",
      },
    ],
  },
};

export const CommunityTokenAndCash: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        remainingLabel: "2,500 $COMMUNITY remaining",
        rewardLabel: "25 $COMMUNITY",
        status: "active",
      },
      {
        objective: "karaoke",
        remainingLabel: "$14.00 USDC remaining",
        rewardLabel: "$1.00 USDC",
        status: "active",
      },
    ],
  },
};

export const LegacyEitherOccupiesBoth: Story = {
  args: {
    legacyEither: {
      remainingLabel: "$7.00 USDC remaining",
      rewardLabel: "$1.00 USDC",
      status: "active",
    },
    onSlotAction: action,
    slots: [],
  },
};

export const BothObjectivesClaimedInPeriod: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        remainingLabel: "$8.20 USDC remaining",
        rewardLabel: "$0.40 USDC",
        status: "active",
        viewerStatusLabel: "Earned this reward period",
      },
      {
        objective: "karaoke",
        remainingLabel: "About 12 rewards remaining",
        rewardLabel: "1 Megapot ticket",
        status: "active",
        viewerStatusLabel: "Earned this reward period",
      },
    ],
  },
};

export const ThirdPartyFundingUnavailable: Story = {
  args: {
    capabilities: {
      canCreate: false,
      canFund: false,
      reason: "The song owner is not accepting third-party funding.",
    },
    onSlotAction: action,
  },
};

export const OwnerCanFundWhenThirdPartyFundingIsBlocked: Story = {
  args: {
    capabilities: { canCreate: true, canFund: true },
    onSlotAction: action,
  },
};

export const Mobile: Story = {
  args: {
    forceMobile: true,
    onSlotAction: action,
    slots: [
      {
        objective: "study",
        remainingLabel: "2,500 $COMMUNITY12 remaining",
        rewardLabel: "25 $COMMUNITY12",
        status: "active",
      },
      {
        objective: "karaoke",
        rewardLabel: "1 Megapot ticket",
        status: "exhausted",
      },
    ],
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
