import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  BoostCampaignSheet,
  SongRewardPolicySheet,
  type BoostCampaignSheetProps,
  type BoostPayoutTierDraft,
} from "../reward-booster-surfaces";
import { formatUsdLabel, parseUsdInput, usdToCents } from "@/lib/formatting/currency";
import {
  boostPlanProblemLabel,
  boostRewardCountLabel,
  MAX_PAYOUT_TIERS,
  resolveDailyAccrualPlan,
} from "@/lib/rewards/boost-plan";

const meta = {
  title: "Compositions/Rewards/Booster",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const base: BoostCampaignSheetProps = {
  budgetDisplayLabel: "$10",
  budgetLabel: "10.00",
  dailyRewardDisplayLabel: "$1.00",
  dailyRewardLabel: "1.00",
  eligibleActivity: "either",
  fundingAmountLabel: "$10",
  open: true,
  rewardCountLabel: "10 rewards",
  state: "compose",
};

export const Setup: Story = {
  render: () => <BoostCampaignSheet {...base} />,
};

export const SetupInvalid: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      budgetDisplayLabel="$0.50"
      budgetLabel="0.50"
      planProblem="The budget must cover at least one reward."
      rewardCountLabel="0 rewards"
    />
  ),
};

export const SetupBusy: Story = {
  render: () => <BoostCampaignSheet {...base} busy />,
};

export const Pay: Story = {
  render: () => <BoostCampaignSheet {...base} state="quote" />,
};

export const PayWalletMismatch: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      onConnectWallet={() => undefined}
      state="quote"
      walletMismatch
      walletMismatchReason="different-wallet"
    />
  ),
};

export const PayWalletMissing: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      onConnectWallet={() => undefined}
      state="quote"
      walletMismatch
      walletMismatchReason="no-wallet"
    />
  ),
};

export const Confirming: Story = {
  render: () => <BoostCampaignSheet {...base} state="confirming" />,
};

export const FundingFailed: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      errorMessage="Switch your wallet to Base Sepolia, then try again. No payment was sent."
      state="failed"
    />
  ),
};

export const FundingReview: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      errorMessage="Funds were received, but the campaign was not activated. Refund or support review is required; do not send again."
      explorerTxUrl="https://sepolia.basescan.org/tx/0x1234"
      state="funding-review"
      supportReference="rfq_01JEXAMPLE"
    />
  ),
};

export const Live: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      endsAtLabel="31 Jul"
      fundedLabel="$10"
      remainingLabel="$7"
      rewardsPaidLabel="$3"
      state="active"
    />
  ),
};

export const OwnerPolicy: Story = {
  render: () => <SongRewardPolicySheet allowThirdPartyRewards open />,
};

export const OwnerPolicyBlocked: Story = {
  render: () => <SongRewardPolicySheet allowThirdPartyRewards={false} open />,
};

/* ── Nationality payout tiers (dark preview) ────────────────────────────────
 * These stories drive the sheet with the real boost-plan math so the tier
 * validation and worst-case count on screen are the ones Phase 1 will enforce.
 * The wrapper owns all state and mints row ids — the sheet itself stays pure.
 */

// Deterministic ids keep story snapshots and tests stable.
let tierIdCounter = 0;
const nextTierId = () => `tier-${(tierIdCounter += 1)}`;

// Preview limits: max reward $5.00, staging cashout minimum $0.25.
const TIERED_LIMITS = {
  maxBudgetCents: 10_000,
  maxRewardCents: 500,
  minBudgetCents: 100,
  minRewardCents: 25,
};

function TieredBoostStory({ initialTiers }: { initialTiers: BoostPayoutTierDraft[] }) {
  const [dailyRewardLabel, setDailyRewardLabel] = React.useState("1.00");
  const [budgetLabel, setBudgetLabel] = React.useState("25.00");
  const [tiers, setTiers] = React.useState<BoostPayoutTierDraft[]>(initialTiers);

  const plan = resolveDailyAccrualPlan(
    dailyRewardLabel,
    budgetLabel,
    TIERED_LIMITS,
    tiers.map((tier) => ({
      amountCents: usdToCents(parseUsdInput(tier.amountLabel)),
      nationalities: tier.nationalities,
    })),
  );

  const claimAmounts = [
    plan.dailyRewardCents,
    ...tiers.map((tier) => usdToCents(parseUsdInput(tier.amountLabel))),
  ].filter((amount): amount is number => amount != null && amount > 0);
  const tierRangeLabel = plan.tiered && claimAmounts.length > 1
    ? `${formatUsdLabel(Math.min(...claimAmounts) / 100)}–${formatUsdLabel(Math.max(...claimAmounts) / 100)} by nationality`
    : undefined;

  return (
    <BoostCampaignSheet
      budgetDisplayLabel={formatUsdLabel((plan.budgetCents ?? 0) / 100) ?? "$0.00"}
      budgetLabel={budgetLabel}
      dailyRewardDisplayLabel={formatUsdLabel((plan.dailyRewardCents ?? 0) / 100) ?? undefined}
      dailyRewardLabel={dailyRewardLabel}
      eligibleActivity="either"
      fundingAmountLabel={formatUsdLabel((plan.budgetCents ?? 0) / 100) ?? undefined}
      maxClaimDisplayLabel={formatUsdLabel((plan.maxClaimCents ?? 0) / 100) ?? undefined}
      maxPayoutTiers={MAX_PAYOUT_TIERS}
      onAddPayoutTier={() =>
        setTiers((current) => [
          ...current,
          { amountLabel: "", id: nextTierId(), nationalities: [] },
        ])}
      onBudgetChange={setBudgetLabel}
      onDailyRewardChange={setDailyRewardLabel}
      onPayoutTierAmountChange={(tierId, amountLabel) =>
        setTiers((current) =>
          current.map((tier) => (tier.id === tierId ? { ...tier, amountLabel } : tier)))}
      onPayoutTierNationalitiesChange={(tierId, nationalities) =>
        setTiers((current) =>
          current.map((tier) => (tier.id === tierId ? { ...tier, nationalities } : tier)))}
      onRemovePayoutTier={(tierId) =>
        setTiers((current) => current.filter((tier) => tier.id !== tierId))}
      open
      payoutTiers={tiers}
      planProblem={plan.problem ? boostPlanProblemLabel(plan.problem, TIERED_LIMITS) : undefined}
      rewardCountLabel={boostRewardCountLabel(plan.rewardCount ?? 0)}
      state="compose"
      tierRangeLabel={tierRangeLabel}
    />
  );
}

export const NationalityTiers: Story = {
  render: () => (
    <TieredBoostStory
      initialTiers={[
        { amountLabel: "0.50", id: "tier-vn", nationalities: ["VNM"] },
        { amountLabel: "5.00", id: "tier-us", nationalities: ["USA"] },
      ]}
    />
  ),
};

export const NationalityTiersEmpty: Story = {
  render: () => <TieredBoostStory initialTiers={[]} />,
};

export const NationalityTiersProblem: Story = {
  render: () => (
    <TieredBoostStory
      initialTiers={[
        { amountLabel: "0.50", id: "tier-vn", nationalities: ["VNM"] },
        // VNM is claimed by both tiers: the plan flags it and Review funding disables.
        { amountLabel: "5.00", id: "tier-us", nationalities: ["USA", "VNM"] },
      ]}
    />
  ),
};
