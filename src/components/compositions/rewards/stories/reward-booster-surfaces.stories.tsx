import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  BoostAmountInput,
  BoostCampaignSheet,
  SongRewardPolicySheet,
  type BoostCampaignSheetProps,
  type BoostPayoutTierDraft,
} from "../reward-booster-surfaces";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Card } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { formatUsdLabel, parseUsdInput, usdToCents } from "@/lib/formatting/currency";
import {
  boostPlanProblemLabel,
  boostRewardCountLabel,
  MAX_PAYOUT_TIERS,
  resolveDailyAccrualPlan,
} from "@/lib/rewards/boost-plan";
import { atomicAmountProblemLabel, parseAtomicAmountInput } from "@/lib/formatting/token-amount";

const meta = {
  title: "Compositions/Bounties/Create",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
const TRANSACTION_HASH = "0xc91d0158c1361deb3c07c8245b3a3d962f06d39176b6c8e7b286ed352bf6eb1b";
const TRANSACTION_URL = `https://basescan.org/tx/${TRANSACTION_HASH}`;

const base: BoostCampaignSheetProps = {
  budgetDisplayLabel: "$10",
  budgetLabel: "10.00",
  dailyRewardDisplayLabel: "$1.00",
  dailyRewardLabel: "1.00",
  eligibleActivity: "either",
  identityProvider: "very",
  fundingAmountLabel: "$10",
  open: true,
  rewardCountLabel: "10 completions",
  state: "compose",
};

export const Setup: Story = {
  render: () => <TieredBoostStory initialTiers={[]} />,
};

export const SetupInvalid: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      budgetDisplayLabel="$0.50"
      budgetLabel="0.50"
      planProblem="The budget must cover at least one bounty."
      rewardCountLabel="0 completions"
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

export const ApprovePayment: Story = {
  render: () => <BoostCampaignSheet {...base} state="confirming" />,
};

export const SubmittedHashKnown: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      explorerTxUrl={TRANSACTION_URL}
      state="confirming"
      transactionHash={TRANSACTION_HASH}
    />
  ),
};

export const Activating: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      explorerTxUrl={TRANSACTION_URL}
      state="awaiting-finality"
      transactionHash={TRANSACTION_HASH}
    />
  ),
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

export const TerminalReview: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      errorMessage="Funds were received, but the campaign was not activated. Refund or support review is required; do not send again."
      explorerTxUrl={TRANSACTION_URL}
      state="funding-review"
      supportReference="rfq_01JEXAMPLE"
      transactionHash={TRANSACTION_HASH}
    />
  ),
};

export const ActiveStudy: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      eligibleActivity="study"
      endsAtLabel="31 Jul"
      explorerTxUrl={TRANSACTION_URL}
      fundedLabel="$10"
      remainingLabel="$7"
      rewardsPaidLabel="$3"
      state="active"
      transactionHash={TRANSACTION_HASH}
    />
  ),
};

export const FundExhaustedStudyBounty: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      budgetDisplayLabel="$25.00"
      budgetLabel="25.00"
      budgetPresets={["$10.00", "$25.00", "$50.00"]}
      dailyRewardDisplayLabel="$0.40 USDC"
      dailyRewardLabel="0.40"
      eligibleActivities={["study"]}
      eligibleActivity="study"
      endsAtLabel="30 Sep"
      fundingAmountLabel="$25.00"
      fundedLabel="$20.00 USDC"
      remainingLabel="$8.20 USDC"
      rewardCountLabel="62 completions"
      state="top_up"
    />
  ),
};

function CommunityTokenSetupStory({
  symbol = "$COMMUNITY",
  symbolProblem,
}: {
  symbol?: string;
  symbolProblem?: string;
}) {
  const [reward, setReward] = React.useState("25.123456789012345678");
  const [budget, setBudget] = React.useState("2500");
  const rewardResult = parseAtomicAmountInput(reward, 18);
  const budgetResult = parseAtomicAmountInput(budget, 18);
  const problem = !rewardResult.ok
    ? atomicAmountProblemLabel(rewardResult.problem, 18)
    : !budgetResult.ok
      ? atomicAmountProblemLabel(budgetResult.problem, 18)
      : undefined;
  const rewardCount = rewardResult.ok && budgetResult.ok
    ? BigInt(budgetResult.atomic) / BigInt(rewardResult.atomic)
    : 0n;

  return (
    <BoostCampaignSheet
      {...base}
      budgetDisplayLabel={`${budget || "0"} ${symbol}`}
      budgetInputAdornment={{ label: symbol, placement: "suffix" }}
      budgetLabel={budget}
      dailyRewardDisplayLabel={`${reward || "0"} ${symbol}`}
      dailyRewardLabel={reward}
      eligibleActivities={["study", "karaoke"]}
      eligibleActivity="study"
      onBudgetChange={setBudget}
      onDailyRewardChange={setReward}
      planProblem={symbolProblem ?? problem}
      rewardCountLabel={`${rewardCount.toString()} completions`}
      rewardInputAdornment={{ label: symbol, placement: "suffix" }}
      state="compose"
    />
  );
}

export const CommunityToken18Decimals: Story = {
  render: () => <CommunityTokenSetupStory />,
};

export const CommunityTokenUnadmittedLongSymbol: Story = {
  render: () => (
    <CommunityTokenSetupStory
      symbol="$INTERNATIONALCOMMUNITYTOKEN"
      symbolProblem="This token's symbol is too long for the community reward registry."
    />
  ),
};

function AmountInputComparisonStory() {
  const [value, setValue] = React.useState("25.123456789012345678");
  return (
    <StandardRoutePage size="rail">
      <Card className="mx-auto grid w-full max-w-2xl gap-5 p-6 shadow-none sm:grid-cols-2">
        <label className="block" htmlFor="comparison-standard-input">
          <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
            Standard input
          </Type>
          <Input id="comparison-standard-input" value="25.00" readOnly />
        </label>
        <label className="block" htmlFor="comparison-reward-input">
          <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
            Reward amount input
          </Type>
          <BoostAmountInput
            adornment={{ label: "$COMMUNITY", placement: "suffix" }}
            id="comparison-reward-input"
            onChange={setValue}
            value={value}
          />
        </label>
      </Card>
    </StandardRoutePage>
  );
}

export const AmountInputPrimitiveComparison: Story = {
  render: () => <AmountInputComparisonStory />,
};

export const CommunityTokenMalformedAmount: Story = {
  render: () => {
    const result = parseAtomicAmountInput("1.2.3", 18);
    return (
      <BoostCampaignSheet
        {...base}
        budgetDisplayLabel="2,500 $COMMUNITY"
        budgetInputAdornment={{ label: "$COMMUNITY", placement: "suffix" }}
        budgetLabel="2500"
        dailyRewardDisplayLabel="1.2.3 $COMMUNITY"
        dailyRewardLabel="1.2.3"
        eligibleActivities={["study", "karaoke"]}
        eligibleActivity="study"
        planProblem={result.ok ? undefined : atomicAmountProblemLabel(result.problem, 18)}
        rewardCountLabel="0 completions"
        rewardInputAdornment={{ label: "$COMMUNITY", placement: "suffix" }}
        state="compose"
      />
    );
  },
};

export const MegapotTicketSetup: Story = {
  render: () => (
    <BoostCampaignSheet
      {...base}
      budgetDisplayLabel="$25.00 USDC"
      budgetLabel="25.00"
      dailyRewardDisplayLabel="1 Megapot ticket"
      dailyRewardLabel="1"
      eligibleActivities={["karaoke"]}
      eligibleActivity="karaoke"
      rewardCountLabel="about 25 completions"
      rewardInputAdornment={{ label: "ticket", placement: "suffix" }}
      state="compose"
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
  const [nationalityPricingEnabled, setNationalityPricingEnabled] = React.useState(initialTiers.length > 0);

  const plan = resolveDailyAccrualPlan(
    dailyRewardLabel,
    budgetLabel,
    TIERED_LIMITS,
    nationalityPricingEnabled ? tiers.map((tier) => ({
      amountCents: usdToCents(parseUsdInput(tier.amountLabel)),
      nationalities: tier.nationalities,
    })) : undefined,
  );

  const claimAmounts = [
    plan.dailyRewardCents,
    ...tiers.map((tier) => usdToCents(parseUsdInput(tier.amountLabel))),
  ].filter((amount): amount is number => amount != null && amount > 0);
  const tierRangeLabel = plan.tiered && claimAmounts.length > 1
    ? `${formatUsdLabel(Math.min(...claimAmounts) / 100)}–${formatUsdLabel(Math.max(...claimAmounts) / 100)} by nationality`
    : undefined;
  const completionRangeLabel = plan.tiered
    && plan.budgetCents != null
    && plan.rewardCount != null
    && claimAmounts.length > 0
    ? `${plan.rewardCount.toLocaleString("en")}–${Math.floor(plan.budgetCents / Math.min(...claimAmounts)).toLocaleString("en")} completions`
    : undefined;

  return (
    <BoostCampaignSheet
      budgetDisplayLabel={formatUsdLabel((plan.budgetCents ?? 0) / 100) ?? "$0.00"}
      budgetLabel={budgetLabel}
      completionRangeLabel={completionRangeLabel}
      dailyRewardDisplayLabel={formatUsdLabel((plan.dailyRewardCents ?? 0) / 100) ?? undefined}
      dailyRewardLabel={dailyRewardLabel}
      eligibleActivity="either"
      identityProvider={nationalityPricingEnabled ? "self" : "very"}
      fundingAmountLabel={formatUsdLabel((plan.budgetCents ?? 0) / 100) ?? undefined}
      maxClaimDisplayLabel={formatUsdLabel((plan.maxClaimCents ?? 0) / 100) ?? undefined}
      maxPayoutTiers={MAX_PAYOUT_TIERS}
      nationalityPricingEnabled={nationalityPricingEnabled}
      onAddPayoutTier={() =>
        setTiers((current) => [
          ...current,
          { amountLabel: "", id: nextTierId(), nationalities: [] },
        ])}
      onBudgetChange={setBudgetLabel}
      onDailyRewardChange={setDailyRewardLabel}
      onNationalityPricingEnabledChange={(enabled) => {
        setNationalityPricingEnabled(enabled);
      }}
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
