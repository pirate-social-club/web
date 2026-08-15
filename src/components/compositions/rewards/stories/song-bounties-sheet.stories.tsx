import type { Meta, StoryObj } from "@storybook/react-vite";

import { SongBountiesSheet } from "../song-bounties-sheet";

const meta = {
  title: "Compositions/Bounties/Song Rewards",
  component: SongBountiesSheet,
  args: {
    capabilities: { canCreate: true, canFund: true },
    open: true,
    showTicketPool: true,
    slots: [],
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SongBountiesSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const action = () => undefined;

const cashSlots = [
  {
    canCreate: false,
    canFund: true,
    objective: "study" as const,
    remainingLabel: "$8.20 USDC remaining",
    rewardLabel: "$0.40 USDC",
    status: "active" as const,
  },
  {
    canCreate: false,
    canFund: true,
    objective: "karaoke" as const,
    remainingLabel: "$14.00 USDC remaining",
    rewardLabel: "$1.00 USDC",
    status: "active" as const,
  },
];

const openPool = {
  beneficiaryCountLabel: "4 singers included",
  cutoffLabel: "Entries close in 12 minutes",
  drawingLabel: "Drawing 7,710 · Base Sepolia",
  fundingLabel: "$0.30 USDC reserved for today's 3 tickets",
  status: "entry_open" as const,
  ticketCountLabel: "3 pool tickets",
};

export const EmptySong: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
  },
};

export const CashAndCash: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
  },
};

export const TieredCashRange: Story = {
  args: {
    onSlotAction: action,
    slots: [
      {
        canCreate: false,
        canFund: true,
        objective: "study",
        remainingLabel: "$48.20 USDC remaining",
        rewardLabel: "$0.40–$5.00 USDC per day",
        status: "active",
      },
      cashSlots[1],
    ],
    showTicketPool: false,
  },
};

export const CashPlusDailyTicketPool: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: openPool,
  },
};

export const EnteredLowCompetitionPool: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: {
      ...openPool,
      beneficiaryCountLabel: "1 singer included",
      cutoffLabel: "Entries close in 24 minutes",
      fundingLabel: "$0.01 USDC reserved for today's ticket",
      ticketCountLabel: "1 pool ticket",
      viewerEntered: true,
    },
  },
};

export const CommunityTokenCashAndPool: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: [
      {
        canCreate: false,
        canFund: true,
        objective: "study",
        remainingLabel: "2,500 $COMMUNITY remaining",
        rewardLabel: "25 $COMMUNITY",
        status: "active",
      },
      cashSlots[1],
    ],
    ticketPool: openPool,
  },
};

export const BeneficiariesFrozen: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: {
      beneficiaryCountLabel: "12 singers committed",
      drawingLabel: "Drawing 7,710 · Base Sepolia",
      fundingLabel: "$0.30 USDC reserved",
      status: "cutoff_frozen",
      ticketCountLabel: "3 pool tickets",
      viewerEntered: true,
    },
  },
};

export const PurchasePending: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: {
      beneficiaryCountLabel: "12 singers committed",
      drawingLabel: "Drawing 7,710 · Base Sepolia",
      status: "purchase_pending",
      ticketCountLabel: "Purchasing 3 pool tickets",
    },
  },
};

export const DrawingPending: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: {
      beneficiaryCountLabel: "12 singers share any winnings",
      drawingLabel: "Drawing 7,710 · Base Sepolia",
      status: "drawing_pending",
      ticketCountLabel: "Tickets #1042, #1043, #1044",
      viewerEntered: true,
    },
  },
};

export const ExhaustedPoolCashStillActive: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: {
      drawingLabel: "Next eligible drawing",
      fundingLabel: "$0.00 USDC pool budget remaining",
      status: "exhausted",
      ticketCountLabel: "0 funded tickets remaining",
    },
  },
};

export const PoolOperationalHold: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: {
      beneficiaryCountLabel: "12 singers committed",
      drawingLabel: "Drawing 7,710 · Base Sepolia",
      status: "operational_hold",
      ticketCountLabel: "3 pool tickets under reconciliation",
    },
  },
};

export const ExhaustedCashSlotPoolStillOpen: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: [
      { canCreate: false, canFund: true, objective: "study", rewardLabel: "$0.40 USDC", status: "exhausted" },
      cashSlots[1],
    ],
    ticketPool: openPool,
  },
};

export const OccupiedCashSlots: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: [
      { canCreate: false, canFund: false, objective: "study", rewardLabel: "25 $COMMUNITY", status: "funding_confirming" },
      { canCreate: false, canFund: false, objective: "karaoke", rewardLabel: "$1.00 USDC", status: "operational_hold" },
    ],
    ticketPool: openPool,
  },
};

export const PausedCashBounty: Story = {
  args: {
    onSlotAction: action,
    slots: [{
      canCreate: false,
      canFund: false,
      objective: "study",
      rewardLabel: "$0.40 USDC",
      status: "paused",
    }],
  },
};

export const ObjectiveUnavailableUntilSlotsShip: Story = {
  args: {
    onSlotAction: action,
    slots: [
      cashSlots[0],
      {
        actionDisabledReason: "A Study bounty already occupies this song. A separate Karaoke bounty is not available yet.",
        canCreate: false,
        canFund: false,
        objective: "karaoke",
        status: "empty",
      },
    ],
  },
};

export const LegacyEitherPlusPool: Story = {
  args: {
    legacyEither: {
      remainingLabel: "$7.00 USDC remaining",
      rewardLabel: "$1.00 USDC",
      status: "active",
    },
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: [],
    ticketPool: openPool,
  },
};

export const BothCashObjectivesClaimedPoolEntered: Story = {
  args: {
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots.map((slot) => ({ ...slot, viewerStatusLabel: "Earned this reward period" })),
    ticketPool: { ...openPool, viewerEntered: true },
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
    onTicketPoolAction: action,
  },
};

export const OwnerCanFundWhenThirdPartyFundingIsBlocked: Story = {
  args: {
    capabilities: { canCreate: true, canFund: true },
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: cashSlots,
    ticketPool: openPool,
  },
};

export const Mobile: Story = {
  args: {
    forceMobile: true,
    onSlotAction: action,
    onTicketPoolAction: action,
    slots: [
      {
        canCreate: false,
        canFund: true,
        objective: "study",
        remainingLabel: "2,500 $COMMUNITY12 remaining",
        rewardLabel: "25 $COMMUNITY12",
        status: "active",
      },
      cashSlots[1],
    ],
    ticketPool: {
      ...openPool,
      beneficiaryCountLabel: "1 singer included",
      fundingLabel: "$0.01 USDC reserved for today's ticket",
      ticketCountLabel: "1 pool ticket",
      viewerEntered: true,
    },
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
