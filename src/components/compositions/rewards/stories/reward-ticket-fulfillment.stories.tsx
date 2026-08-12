import type { Meta, StoryObj } from "@storybook/react-vite";

import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { RewardTicketFulfillment, type RewardTicketFulfillmentProps } from "../reward-ticket-fulfillment";

const meta = {
  title: "Compositions/Bounties/Ticket Fulfillment",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Frame(props: RewardTicketFulfillmentProps) {
  return (
    <StandardRoutePage size="rail">
      <div className="mx-auto w-full max-w-lg py-8">
        <RewardTicketFulfillment {...props} onAction={() => undefined} />
      </div>
    </StandardRoutePage>
  );
}

export const PriceUnavailable: Story = {
  render: () => <Frame state="price_stale" />,
};

export const PriceAboveFundingLimit: Story = {
  render: () => <Frame priceCeilingLabel="$1.10 USDC" state="price_blocked" />,
};

export const Reserved: Story = {
  render: () => <Frame state="reserved" />,
};

export const Submitted: Story = {
  render: () => (
    <Frame
      state="submitted"
      transactionLabel="0xc91d0158c1361deb3c07c8245b3a3d962f06d39176b6c8e7b286ed352bf6eb1b"
    />
  ),
};

export const DeliveredAtReservedPrice: Story = {
  render: () => <Frame state="confirmed" ticketLabel="Megapot ticket #1042" />,
};

export const DeliveredBelowReservedPrice: Story = {
  render: () => (
    <Frame
      fundingAdjustmentLabel="$0.10 USDC returned to this bounty's available funding."
      state="confirmed"
      ticketLabel="Megapot ticket #1042"
    />
  ),
};

export const DeliveredAboveCachedPriceWithinLimit: Story = {
  render: () => (
    <Frame
      fundingAdjustmentLabel="The price rose by $0.02 USDC but stayed within the accepted funding limit. Unused reserved funding was returned to the bounty."
      state="confirmed"
      ticketLabel="Megapot ticket #1042"
    />
  ),
};

export const Failed: Story = {
  render: () => <Frame state="failed" />,
};

export const ReservationExpired: Story = {
  render: () => <Frame state="reservation_expired" />,
};

export const NeedsReview: Story = {
  render: () => (
    <Frame
      state="needs_review"
      transactionLabel="0xc91d0158c1361deb3c07c8245b3a3d962f06d39176b6c8e7b286ed352bf6eb1b"
    />
  ),
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => <Frame priceCeilingLabel="$1.10 USDC" state="price_blocked" />,
};
