import type { Meta, StoryObj } from "@storybook/react-vite";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import {
  RewardTicketPoolLifecycle,
  type RewardTicketPoolLifecycleProps,
} from "../reward-ticket-fulfillment";

const meta = {
  title: "Compositions/Bounties/Ticket Pool Lifecycle",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Frame(props: RewardTicketPoolLifecycleProps) {
  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto w-full max-w-lg py-8">
        <RewardTicketPoolLifecycle {...props} onAction={() => undefined} />
      </div>
    </StandardRoutePage>
  );
}

const drawing = "Drawing 7,710 · Base Sepolia";

export const EntryOpen: Story = {
  render: () => (
    <Frame
      beneficiaryCountLabel="4 singers entered"
      cutoffLabel="Entries close in 12 minutes"
      drawingLabel={drawing}
      phase="entry_open"
      ticketCountLabel="3 pool tickets"
    />
  ),
};

export const EnteredLowCompetition: Story = {
  render: () => (
    <Frame
      beneficiaryCountLabel="1 singer entered"
      cutoffLabel="Entries close in 24 minutes"
      drawingLabel={drawing}
      phase="entered"
      ticketCountLabel="1 pool ticket"
    />
  ),
};

export const ZeroBeneficiariesNoSpend: Story = {
  render: () => (
    <Frame
      beneficiaryCountLabel="0 verified singers"
      drawingLabel={drawing}
      phase="closed_no_entries"
    />
  ),
};

export const BeneficiariesFrozen: Story = {
  render: () => (
    <Frame
      beneficiaryCountLabel="12 singers committed"
      drawingLabel={drawing}
      evidenceUrl="https://example.invalid/commitment/7710"
      phase="cutoff_frozen"
      ticketCountLabel="3 pool tickets"
    />
  ),
};

export const PriceUnavailable: Story = {
  render: () => <Frame drawingLabel={drawing} issue="price_stale" phase="cutoff_frozen" ticketCountLabel="3 pool tickets" />,
};

export const PriceAboveFundingLimit: Story = {
  render: () => (
    <Frame
      drawingLabel={drawing}
      issue="price_ceiling"
      phase="cutoff_frozen"
      priceCeilingLabel="$0.02 USDC"
      ticketCountLabel="3 pool tickets"
    />
  ),
};

export const InsufficientPoolBudget: Story = {
  render: () => <Frame drawingLabel={drawing} issue="insufficient_budget" phase="cutoff_frozen" ticketCountLabel="3 pool tickets" />,
};

export const CommitmentFailed: Story = {
  render: () => <Frame beneficiaryCountLabel="12 singers frozen" drawingLabel={drawing} issue="snapshot_commit_failed" phase="cutoff_frozen" />,
};

export const PurchaseReserved: Story = {
  render: () => <Frame beneficiaryCountLabel="12 singers" drawingLabel={drawing} phase="purchase_reserved" ticketCountLabel="3 pool tickets" />,
};

export const PurchaseSubmitted: Story = {
  render: () => (
    <Frame
      beneficiaryCountLabel="12 singers"
      drawingLabel={drawing}
      evidenceUrl="https://sepolia.basescan.org/tx/0xc91d"
      phase="purchase_submitted"
      ticketCountLabel="3 pool tickets"
      transactionLabel="0xc91d0158c1361deb3c07c8245b3a3d962f06d39176b6c8e7b286ed352bf6eb1b"
    />
  ),
};

export const PurchaseFailed: Story = {
  render: () => <Frame drawingLabel={drawing} issue="purchase_failed" phase="cutoff_frozen" ticketCountLabel="3 pool tickets" />,
};

export const TicketsConfirmed: Story = {
  render: () => <Frame beneficiaryCountLabel="12 singers" drawingLabel={drawing} phase="tickets_confirmed" ticketCountLabel="Tickets #1042, #1043, #1044" />,
};

export const DrawingPending: Story = {
  render: () => <Frame beneficiaryCountLabel="12 singers share any net win" drawingLabel={drawing} phase="drawing_pending" ticketCountLabel="3 pool tickets" />,
};

export const DrawingDelayed: Story = {
  render: () => (
    <Frame
      beneficiaryCountLabel="12 singers committed"
      drawingLabel={drawing}
      issue="drawing_delayed"
      phase="drawing_pending"
      ticketCountLabel="3 pool tickets"
    />
  ),
};

export const NoWin: Story = {
  render: () => <Frame beneficiaryCountLabel="12 singers" drawingLabel="Drawing 7,709 · Base Sepolia" phase="no_win" ticketCountLabel="3 pool tickets" />,
};

export const WinningsDetected: Story = {
  render: () => <Frame amountLabel="5.00 USDC detected" beneficiaryCountLabel="12 singers" drawingLabel="Drawing 7,709 · Base Sepolia" phase="winnings_detected" shareLabel="Equal v1 allocation after claim confirmation" />,
};

export const ClaimSubmitted: Story = {
  render: () => <Frame amountLabel="5.00 USDC gross winnings" beneficiaryCountLabel="12 singers" drawingLabel="Drawing 7,709 · Base Sepolia" phase="claim_submitted" transactionLabel="0xa183fd88eec87e05284a9254f8de5ab7c19077b2f02d8da15ca0b8c21c83f055" />,
};

export const SubCentCredit: Story = {
  render: () => <Frame amountLabel="0.003333 USDC credited" beneficiaryCountLabel="3 singers" drawingLabel="Drawing 7,709 · Base Sepolia" phase="credited" shareLabel="Equal allocation · 3,333 atomic USDC" />,
};

export const MultipleWinningTickets: Story = {
  render: () => <Frame amountLabel="52.00 USDC credited" beneficiaryCountLabel="8 singers" drawingLabel="Drawing 7,709 · Base Sepolia" phase="credited" shareLabel="2 winning tickets · 6.50 USDC each" ticketCountLabel="5 pool tickets" />,
};

export const SweepStale: Story = {
  render: () => <Frame drawingLabel="Drawing 7,709 · Base Sepolia" issue="sweep_stale" phase="operational_review" ticketCountLabel="3 pool tickets" />,
};

export const TopTierReview: Story = {
  render: () => <Frame amountLabel="Winning amount under reconciliation" beneficiaryCountLabel="5 singers" drawingLabel="Drawing 7,709 · Base Sepolia" phase="operational_review" shareLabel="Committed equal-v1 allocation" />,
};

export const MobileEntered: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <Frame beneficiaryCountLabel="1 singer entered" cutoffLabel="Entries close in 24 minutes" drawingLabel={drawing} phase="entered" ticketCountLabel="1 pool ticket" />,
};
