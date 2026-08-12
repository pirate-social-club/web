"use client";

import * as React from "react";
import {
  CheckCircle,
  HourglassMedium,
  ShieldWarning,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { IconButton } from "@/components/primitives/icon-button";
import { Switch } from "@/components/primitives/switch";
import { Type } from "@/components/primitives/type";
import { NationalityMultiPicker } from "@/components/compositions/community/create-composer/nationality-picker";
import { MAX_PAYOUT_TIERS } from "@/lib/rewards/boost-plan";
import { cn } from "@/lib/utils";
import {
  BoostAmountInput,
  type BoostAmountInputAdornment,
  CampaignSummaryRow,
  FundingTransaction,
} from "./boost-campaign-sheet-parts";

export { BoostAmountInput } from "./boost-campaign-sheet-parts";

/**
 * Presentational surfaces for the "daily_accrual" reward model (see boost-plan.ts):
 * a per-person, per-day reward for studying/karaoke-ing a song. A future
 * "prize_pool" model (e.g. a remix contest) is a different shape and gets its
 * own surface rather than more props on this one.
 */

type BoostCampaignSheetState =
  | "compose"
  | "top_up"
  | "draft-preview"
  | "quote"
  | "confirming"
  | "awaiting-finality"
  | "active"
  | "funding-review"
  | "failed";

export type BoostEligibleActivity = "study" | "karaoke" | "either";
export type BoostRewardIdentityProvider = "self" | "zkpassport" | "very";

/**
 * One row of the dark nationality-tier preview: a set of ISO-3166 alpha-3
 * nationalities and the raw amount input for that tier. The sheet never
 * mints `id`s — the owner (story, or the controller once Phase 1 lands) creates
 * rows so tests and stories stay deterministic.
 */
export interface BoostPayoutTierDraft {
  id: string;
  nationalities: string[];
  amountLabel: string;
}

export interface BoostCampaignSheetProps {
  budgetInputAdornment?: BoostAmountInputAdornment;
  busy?: boolean;
  /** A terminal transaction failed without moving funds, so a fresh quote is safe. */
  canRestartFunding?: boolean;
  budgetDisplayLabel: string;
  budgetLabel: string;
  /** Preset budgets offered as one-tap chips, already formatted (e.g. "$25.00"). */
  budgetPresets?: string[];
  dailyRewardLabel: string;
  /** Formatted reward for review/live surfaces (e.g. "$1.00"); inputs keep the raw `dailyRewardLabel`. */
  dailyRewardDisplayLabel?: string;
  rewardInputAdornment?: BoostAmountInputAdornment;
  eligibleActivity: BoostEligibleActivity;
  eligibleActivities?: BoostEligibleActivity[];
  identityProvider?: BoostRewardIdentityProvider;
  identityProviderChoices?: BoostRewardIdentityProvider[];
  errorMessage?: string;
  /** Funding-transaction link on the settlement chain's explorer (Base or Base Sepolia). */
  explorerTxUrl?: string;
  /** Full funding-transaction hash, available as soon as the wallet submits it. */
  transactionHash?: string;
  endsAtLabel?: string;
  forceMobile?: boolean;
  fundingAmountLabel?: string;
  fundedLabel?: string;
  /**
   * Gated nationality-tier preview. The section renders ONLY when this prop is
   * present (even as []); undefined keeps the pre-tier sheet exactly. Nothing
   * here initiates funding; the controller may persist draft-only terms when
   * both its local preview flag and the server capability allow it.
   */
  payoutTiers?: BoostPayoutTierDraft[];
  /** Whether this draft pays by verified passport nationality. */
  nationalityPricingEnabled?: boolean;
  onNationalityPricingEnabledChange?: (enabled: boolean) => void;
  /** Cap on tier rows; defaults to boost-plan's MAX_PAYOUT_TIERS. */
  maxPayoutTiers?: number;
  onAddPayoutTier?: () => void;
  onRemovePayoutTier?: (tierId: string) => void;
  onPayoutTierNationalitiesChange?: (tierId: string, nationalities: string[]) => void;
  onPayoutTierAmountChange?: (tierId: string, amountLabel: string) => void;
  /** Formatted worst case per claim (e.g. "$5.00") for the mandatory tiered caption. */
  maxClaimDisplayLabel?: string;
  /** Range summary for the quote state when tiered (e.g. "$0.50–$5.00 by nationality"). */
  tierRangeLabel?: string;
  /** Live budget yield for tiered bounties (e.g. "5–25 completions"). */
  completionRangeLabel?: string;
  onBudgetChange?: (value: string) => void;
  onConfirm?: () => void;
  /** Recovery action offered when the pinned funding wallet is not connected. */
  onConnectWallet?: () => void;
  onDailyRewardChange?: (value: string) => void;
  onEligibleActivityChange?: (value: BoostEligibleActivity) => void;
  onIdentityProviderChange?: (value: BoostRewardIdentityProvider) => void;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  open: boolean;
  /** Blocks submission and explains why the current terms are not fundable. */
  planProblem?: string;
  rewardCountLabel: string;
  rewardsPaidLabel?: string;
  remainingLabel?: string;
  supportReference?: string;
  state: BoostCampaignSheetState;
  /** True when the quote's pinned funding wallet is not connected; blocks payment. */
  walletMismatch?: boolean;
  /** Why the pinned wallet is unavailable: nothing connected vs a different wallet connected. */
  walletMismatchReason?: "different-wallet" | "no-wallet";
}

export interface SongRewardPolicySheetProps {
  allowThirdPartyRewards: boolean;
  busy?: boolean;
  errorMessage?: string;
  onAllowThirdPartyRewardsChange?: (allowed: boolean) => void;
  onOpenChange?: (open: boolean) => void;
  open: boolean;
}

const ACTIVITY_LABEL = {
  study: "a study set",
  karaoke: "a karaoke pass",
  either: "a study set or karaoke pass",
} satisfies Record<BoostEligibleActivity, string>;

/** Radio-card titles for the exclusive eligible-activity enum. */
const ACTIVITY_TITLE = {
  karaoke: "Karaoke",
  study: "Study",
  either: "Either",
} satisfies Record<BoostEligibleActivity, string>;

export function BoostCampaignSheet({
  budgetInputAdornment = { label: "$", placement: "prefix" },
  busy,
  budgetDisplayLabel,
  budgetLabel,
  budgetPresets,
  canRestartFunding,
  dailyRewardLabel,
  dailyRewardDisplayLabel,
  rewardInputAdornment = { label: "$", placement: "prefix" },
  eligibleActivity,
  eligibleActivities = ["karaoke", "study", "either"],
  identityProvider = "self",
  identityProviderChoices = [],
  endsAtLabel,
  errorMessage,
  explorerTxUrl,
  forceMobile,
  fundingAmountLabel,
  fundedLabel,
  payoutTiers,
  nationalityPricingEnabled,
  onNationalityPricingEnabledChange,
  maxPayoutTiers = MAX_PAYOUT_TIERS,
  onAddPayoutTier,
  onRemovePayoutTier,
  onPayoutTierNationalitiesChange,
  onPayoutTierAmountChange,
  tierRangeLabel,
  completionRangeLabel,
  onBudgetChange,
  onConfirm,
  onConnectWallet,
  onDailyRewardChange,
  onEligibleActivityChange,
  onIdentityProviderChange,
  onOpenChange,
  onRefresh,
  onRetry,
  retryLabel,
  open,
  planProblem,
  rewardCountLabel,
  rewardsPaidLabel,
  remainingLabel,
  state,
  supportReference,
  transactionHash,
  walletMismatch,
  walletMismatchReason = "no-wallet",
}: BoostCampaignSheetProps) {
  const activityLabelId = React.useId();
  const identityProviderLabelId = React.useId();
  const rewardDisplay = dailyRewardDisplayLabel ?? dailyRewardLabel;
  // The tier section renders only when the owner passes `payoutTiers` (even as
  // []); `tiered` (at least one row) flips budget math to worst-case display.
  const nationalityPricingAvailable = payoutTiers != null;
  const payoutTierRows = payoutTiers ?? [];
  const tiered = nationalityPricingEnabled ?? (
    nationalityPricingAvailable && payoutTierRows.length > 0
  );
  const showPayoutTiers = nationalityPricingAvailable && tiered;
  const identityProviderLabel = {
    self: "Passport check",
    very: "Palm check",
    zkpassport: "Passport check",
  }[identityProvider];
  const identityProviderBrand = {
    self: "Self",
    very: "Very",
    zkpassport: "ZKPassport",
  }[identityProvider];
  const identityProviderBrands = {
    self: "Self",
    very: "Very",
    zkpassport: "ZKPassport",
  } satisfies Record<BoostRewardIdentityProvider, string>;
  const payoutTiersLabelId = React.useId();
  // The sheet renders inside a modal dialog, whose focus trap suppresses
  // anything portaled to document.body — so the country dropdown portals into
  // the section itself. Callback ref: state, so the portal target exists on
  // the render that mounts the picker.
  const [tierPortalContainer, setTierPortalContainer] = React.useState<HTMLElement | null>(null);

  const handleActivityKeyDown = (event: React.KeyboardEvent, index: number) => {
    const lastIndex = eligibleActivities.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    }
    if (nextIndex == null) return;
    event.preventDefault();
    const next = eligibleActivities[nextIndex];
    onEligibleActivityChange?.(next);
    document.getElementById(`${activityLabelId}-${next}`)?.focus();
  };

  const handleIdentityProviderKeyDown = (event: React.KeyboardEvent, index: number) => {
    const lastIndex = identityProviderChoices.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    }
    if (nextIndex == null) return;
    event.preventDefault();
    const next = identityProviderChoices[nextIndex];
    onIdentityProviderChange?.(next);
    document.getElementById(`${identityProviderLabelId}-${next}`)?.focus();
  };

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent
        className={cn(
          "flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-[var(--radius-3xl)] border-x-0 border-b-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4",
          !forceMobile && "md:w-[min(100%-2rem,36rem)] md:max-w-[36rem] md:px-7 md:pb-7 md:pt-7",
        )}
        mobileSide="bottom"
      >
        <div className={cn("mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/60", !forceMobile && "md:hidden")} aria-hidden="true" />
        <ModalHeader className="text-start">
          <ModalTitle>{state === "top_up" ? "Fund bounty" : "Create a bounty"}</ModalTitle>
          <ModalDescription className="sr-only">
            Fund a bounty for people who practice this song.
          </ModalDescription>
        </ModalHeader>

        {state === "compose" ? (
          <div className="mt-5 space-y-4">
            <div>
              <Type as="span" className="mb-2 block text-muted-foreground" id={activityLabelId} variant="label">
                People earn by
              </Type>
              <div aria-labelledby={activityLabelId} className="grid gap-2" role="radiogroup">
                {eligibleActivities.map((activity, index) => {
                  const selected = eligibleActivity === activity;
                  return (
                    <button
                      aria-checked={selected}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-lg border px-4 text-start transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected ? "border-primary/40 bg-primary-subtle" : "border-border-soft",
                      )}
                      id={`${activityLabelId}-${activity}`}
                      key={activity}
                      onClick={() => onEligibleActivityChange?.(activity)}
                      onKeyDown={(event) => handleActivityKeyDown(event, index)}
                      role="radio"
                      tabIndex={selected ? 0 : -1}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-primary" : "border-muted-foreground/50",
                        )}
                      >
                        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                      </span>
                      <Type as="span" variant="body">
                        {ACTIVITY_TITLE[activity]}
                      </Type>
                    </button>
                  );
                })}
              </div>
            </div>
            {nationalityPricingAvailable ? (
              <div>
                <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                  Bounty amount
                </Type>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Bounty amount">
                  {([
                    { enabled: false, label: "Same for everyone" },
                    { enabled: true, label: "Varies by nationality" },
                  ] as const).map((option) => {
                    const selected = tiered === option.enabled;
                    return (
                      <button
                        aria-checked={selected}
                        className={cn(
                          "min-h-11 rounded-lg border px-3 py-2 text-start transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected ? "border-primary/40 bg-primary-subtle" : "border-border-soft",
                        )}
                        key={option.label}
                        onClick={() => onNationalityPricingEnabledChange?.(option.enabled)}
                        role="radio"
                        type="button"
                      >
                        <Type as="span" variant="body">{option.label}</Type>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {identityProviderChoices.length > 0 ? (
              <div>
                <Type as="span" className="mb-2 block text-muted-foreground" id={identityProviderLabelId} variant="label">
                  Claimant check
                </Type>
                <div aria-labelledby={identityProviderLabelId} className="grid gap-2" role="radiogroup">
                  {identityProviderChoices.map((provider, index) => {
                    const selected = identityProvider === provider;
                    return (
                      <button
                        aria-checked={selected}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-lg border px-4 text-start transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected ? "border-primary/40 bg-primary-subtle" : "border-border-soft",
                        )}
                        id={`${identityProviderLabelId}-${provider}`}
                        key={provider}
                        onClick={() => onIdentityProviderChange?.(provider)}
                        onKeyDown={(event) => handleIdentityProviderKeyDown(event, index)}
                        role="radio"
                        tabIndex={selected ? 0 : -1}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-full border",
                            selected ? "border-primary" : "border-muted-foreground/50",
                          )}
                        >
                          {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                        </span>
                        <Type as="span" variant="body">{identityProviderBrands[provider]}</Type>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {tiered ? (
              <Type as="p" className="text-muted-foreground" variant="caption">
                A passport is required.
              </Type>
            ) : null}

            {!tiered ? (
              <label className="block" htmlFor="boost-daily-reward">
                <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                  Bounty per learner
                </Type>
                <BoostAmountInput adornment={rewardInputAdornment} id="boost-daily-reward" onChange={onDailyRewardChange} value={dailyRewardLabel} />
              </label>
            ) : null}

            {showPayoutTiers ? (
              <section aria-labelledby={payoutTiersLabelId} ref={setTierPortalContainer}>
                <Type as="span" className="sr-only" id={payoutTiersLabelId}>Country payouts</Type>
                {payoutTierRows.length > 0 ? (
                  <div className="mb-2 grid grid-cols-[minmax(0,1fr)_8rem_2.5rem] gap-2 px-1">
                    <Type as="span" className="text-muted-foreground" variant="label">
                      Countries
                    </Type>
                    <Type as="span" className="text-muted-foreground" variant="label">
                      Amount
                    </Type>
                  </div>
                ) : null}
                <div className="space-y-2">
                  {payoutTierRows.map((tier, index) => (
                    <div className="grid grid-cols-[minmax(0,1fr)_8rem_2.5rem] items-center gap-2" key={tier.id}>
                      <NationalityMultiPicker
                        inputAriaLabel={`Search countries for payout group ${index + 1}`}
                        noResultsLabel="No countries found"
                        onChange={(codes) => onPayoutTierNationalitiesChange?.(tier.id, codes)}
                        placeholder="Choose countries"
                        portalContainer={tierPortalContainer}
                        values={tier.nationalities}
                      />
                      <label className="block" htmlFor={`boost-tier-amount-${tier.id}`}>
                        <Type as="span" className="sr-only">
                          Country group {index + 1} bounty
                        </Type>
                        <BoostAmountInput
                          adornment={rewardInputAdornment}
                          id={`boost-tier-amount-${tier.id}`}
                          onChange={(value) => onPayoutTierAmountChange?.(tier.id, value)}
                          value={tier.amountLabel}
                        />
                      </label>
                      <IconButton
                        aria-label={`Remove country group ${index + 1}`}
                        onClick={() => onRemovePayoutTier?.(tier.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <X aria-hidden="true" className="size-5" weight="bold" />
                      </IconButton>
                    </div>
                  ))}
                  <Button
                    className="h-10 w-full"
                    disabled={payoutTierRows.length >= maxPayoutTiers}
                    onClick={onAddPayoutTier}
                    type="button"
                    variant="outline"
                  >
                    Add countries
                  </Button>
                  <div className="grid grid-cols-[minmax(0,1fr)_8rem_2.5rem] items-center gap-2 border-t border-border-soft pt-2">
                    <Type as="span" variant="body">Everyone else</Type>
                    <label className="block" htmlFor="boost-daily-reward">
                      <Type as="span" className="sr-only">Everyone else bounty</Type>
                      <BoostAmountInput adornment={rewardInputAdornment} id="boost-daily-reward" onChange={onDailyRewardChange} value={dailyRewardLabel} />
                    </label>
                  </div>
                </div>
              </section>
            ) : null}

            <div>
              <label className="block" htmlFor="boost-budget">
                <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                  Total budget
                </Type>
                <BoostAmountInput
                  adornment={budgetInputAdornment}
                  describedBy={planProblem ? "boost-plan-problem" : undefined}
                  id="boost-budget"
                  invalid={Boolean(planProblem)}
                  onChange={onBudgetChange}
                  value={budgetLabel}
                />
              </label>
              {tiered && completionRangeLabel ? (
                <Type as="p" className="mt-2 text-muted-foreground" variant="caption">
                  {budgetDisplayLabel} funds about {completionRangeLabel}, depending on who claims.
                </Type>
              ) : null}
              {budgetPresets?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {budgetPresets.map((preset) => (
                    <Button
                      className="h-9"
                      key={preset}
                      onClick={() => onBudgetChange?.(preset)}
                      type="button"
                      variant={preset === budgetLabel ? "secondary" : "outline"}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            {planProblem ? (
              <div
                className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
                id="boost-plan-problem"
              >
                <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" />
                <Type as="p" className="text-destructive" variant="body">
                  {planProblem}
                </Type>
              </div>
            ) : (
              <Type as="p" className="text-muted-foreground" variant="caption">
                You pay {budgetDisplayLabel} now. Bounty terms lock after payment; unused funds can't be withdrawn.
              </Type>
            )}
          </div>
        ) : null}

        {state === "top_up" ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-border-soft px-4">
              <CampaignSummaryRow label="Activity" value={ACTIVITY_TITLE[eligibleActivity]} />
              <CampaignSummaryRow label="Bounty" value={rewardDisplay} />
              {fundedLabel ? <CampaignSummaryRow label="Funded" value={fundedLabel} /> : null}
              {remainingLabel ? <CampaignSummaryRow label="Remaining" value={remainingLabel} /> : null}
              {endsAtLabel ? <CampaignSummaryRow label="Ends" value={endsAtLabel} /> : null}
            </div>
            <div>
              <label className="block" htmlFor="boost-top-up-budget">
                <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                  Add funding
                </Type>
                <BoostAmountInput
                  adornment={budgetInputAdornment}
                  describedBy={planProblem ? "boost-plan-problem" : undefined}
                  id="boost-top-up-budget"
                  invalid={Boolean(planProblem)}
                  onChange={onBudgetChange}
                  value={budgetLabel}
                />
              </label>
              {budgetPresets?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {budgetPresets.map((preset) => (
                    <Button
                      className="h-9"
                      key={preset}
                      onClick={() => onBudgetChange?.(preset)}
                      type="button"
                      variant={preset === budgetLabel ? "secondary" : "outline"}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
            <Type as="p" className="text-muted-foreground" variant="caption">
              Funding adds rewards without changing the bounty terms or end date.
            </Type>
          </div>
        ) : null}

        {state === "quote" ? (
          <div className="mt-5 space-y-4">
            <Card className="border-primary/30 bg-primary-subtle p-4 text-center shadow-none">
              <Type as="div" className="text-muted-foreground" variant="overline">
                Pay now
              </Type>
              <Type as="div" className="mt-0.5 tabular-nums" variant="h1">
                {fundingAmountLabel}
              </Type>
            </Card>

            <div className="rounded-lg border border-border-soft px-4">
              <CampaignSummaryRow
                label="Bounty per day"
                value={tiered && tierRangeLabel ? tierRangeLabel : rewardDisplay}
              />
              <CampaignSummaryRow
                label="Pays for"
                value={tiered ? `At least ${rewardCountLabel}` : `Up to ${rewardCountLabel}`}
              />
              <CampaignSummaryRow
                label="Claimant check"
                value={`${identityProviderLabel} · ${identityProviderBrand}`}
              />
            </div>
            {tiered ? (
              <Type as="p" className="text-muted-foreground" variant="caption">
                Payments are public on Base. Amounts differ by tier, so a payment can reveal which tier someone matched.
              </Type>
            ) : null}

            {walletMismatch ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" />
                  <Type as="p" className="text-destructive" variant="body">
                    {walletMismatchReason === "different-wallet"
                      ? "A different wallet is connected. This bounty can only be paid from your Pirate Wallet."
                      : "Connect your Pirate Wallet to pay. This bounty was prepared for that wallet."}
                  </Type>
                </div>
                {onConnectWallet ? (
                  <Button className="mt-3 h-11 w-full" onClick={onConnectWallet} type="button" variant="outline">
                    Connect Pirate Wallet
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {state === "draft-preview" ? (
          <div className="mt-6 rounded-lg border border-primary/30 bg-primary-subtle p-4">
            <div className="flex items-start gap-3">
              <CheckCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" weight="fill" />
              <div>
                <Type as="div" variant="body-strong">Tiered draft saved</Type>
                <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                  Funding stays disabled until nationality-based claim resolution is available. No payment was requested.
                </Type>
              </div>
            </div>
          </div>
        ) : null}

        {state === "confirming" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                {transactionHash ? "Payment sent" : "Approve payment"}
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                {transactionHash
                  ? "Your payment is on Base. The bounty will activate automatically. Do not send again."
                  : "Confirm the payment in your wallet."}
              </Type>
            </div>
          </div>
        ) : null}

        {state === "awaiting-finality" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                Activating bounty…
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                Your payment is on Base. The bounty will activate automatically. Do not send again.
              </Type>
            </div>
          </div>
        ) : null}

        {state === "active" ? (
          <div className="mt-6 rounded-lg border border-border-soft p-4">
            <div className="flex items-start gap-3">
              <CheckCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" weight="fill" />
              <div>
                <Type as="div" variant="body-strong">
                  Bounty is live
                </Type>
                <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                  People can earn {rewardDisplay} for {ACTIVITY_LABEL[eligibleActivity]}.
                </Type>
              </div>
            </div>
            {fundedLabel && rewardsPaidLabel && remainingLabel ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3">
                {[
                  ["Funded", fundedLabel],
                  ["Earned", rewardsPaidLabel],
                  ["Left", remainingLabel],
                  ["Each", rewardDisplay],
                  ...(endsAtLabel ? [["Ends", endsAtLabel]] : []),
                ].map(([label, value]) => (
                  <div key={label}>
                    <Type as="dt" className="text-muted-foreground" variant="caption">{label}</Type>
                    <Type as="dd" variant="body-strong">{value}</Type>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}

        {state === "failed" ? (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-border-soft p-4">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" />
            <div>
              <Type as="div" variant="body-strong">
                Funding failed
              </Type>
              <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                {errorMessage ?? "We could not create the bounty. No payment was sent."}
              </Type>
            </div>
          </div>
        ) : null}

        {state === "funding-review" ? (
          <div className="mt-6 rounded-lg border border-warning/40 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldWarning aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" weight="fill" />
              <div>
                <Type as="div" variant="body-strong">
                  Campaign not activated
                </Type>
                <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                  {errorMessage ?? "Funds arrived, but the bounty didn't activate. Don't send again; we'll review or refund."}
                </Type>
              </div>
            </div>
            {supportReference ? (
              <div className="mt-4">
                <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                  Support reference
                </Type>
                <CopyField value={supportReference} />
              </div>
            ) : null}
          </div>
        ) : null}

        {transactionHash && ["confirming", "awaiting-finality", "active", "funding-review"].includes(state) ? (
          <FundingTransaction explorerTxUrl={explorerTxUrl} transactionHash={transactionHash} />
        ) : null}

        <ModalFooter className="mt-6">
          {state === "compose" ? (
            <Button className="h-12 w-full" disabled={Boolean(planProblem) || busy} onClick={onConfirm}>
              Review funding
            </Button>
          ) : null}
          {state === "top_up" ? (
            <Button className="h-12 w-full" disabled={Boolean(planProblem) || busy} onClick={onConfirm}>
              Review funding
            </Button>
          ) : null}
          {state === "quote" ? (
            <Button className="h-12 w-full" disabled={Boolean(walletMismatch) || busy} onClick={onConfirm}>
              Approve payment
            </Button>
          ) : null}
          {state === "draft-preview" ? (
            <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)}>
              Done
            </Button>
          ) : null}
          {(state === "confirming" || state === "awaiting-finality") && transactionHash ? (
            <Button className="h-10 w-full" disabled={busy} onClick={onRefresh} variant="ghost">
              Check status
            </Button>
          ) : null}
          {state === "failed" ? (
            <Button className="h-12 w-full" disabled={busy} onClick={onRetry} variant="outline">
              {retryLabel ?? "Start again"}
            </Button>
          ) : null}
          {state === "active" ? (
            <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)}>
              Done
            </Button>
          ) : null}
          {state === "funding-review" ? (
            <Button
              className="h-12 w-full"
              disabled={busy}
              onClick={canRestartFunding ? onRetry : () => onOpenChange?.(false)}
              variant={canRestartFunding ? "outline" : "default"}
            >
              {canRestartFunding ? "Start new funding" : "Done"}
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function SongRewardPolicySheet({
  allowThirdPartyRewards,
  busy,
  errorMessage,
  onAllowThirdPartyRewardsChange,
  onOpenChange,
  open,
}: SongRewardPolicySheetProps) {
  const policyLabelId = React.useId();
  return (
    <Modal onOpenChange={onOpenChange} open={open}>
      <ModalContent className="w-[min(100%-2rem,32rem)] max-w-[32rem]">
        <ModalHeader className="text-start">
          <ModalTitle>Bounty settings</ModalTitle>
          <ModalDescription>
            Choose whether other people can fund bounties for this song.
          </ModalDescription>
        </ModalHeader>
        <div className="mt-5 rounded-lg border border-border-soft p-4">
          <div className="flex items-center justify-between gap-4">
            <Type as="div" id={policyLabelId} variant="body-strong">
              Allow others to fund bounties
            </Type>
            <Switch
              aria-labelledby={policyLabelId}
              checked={allowThirdPartyRewards}
              disabled={busy}
              onCheckedChange={onAllowThirdPartyRewardsChange}
            />
          </div>
          {!allowThirdPartyRewards ? (
            <Type as="p" className="mt-2 text-muted-foreground" variant="body">
              Blocking pauses third-party bounties. Funding is not returned.
            </Type>
          ) : null}
        </div>
        {errorMessage ? <Type as="p" className="mt-3 text-destructive" variant="body">{errorMessage}</Type> : null}
        <ModalFooter className="mt-6">
          <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)} variant="outline">Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
