"use client";

import * as React from "react";
import {
  ArrowSquareOut,
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
import { Input } from "@/components/primitives/input";
import { Switch } from "@/components/primitives/switch";
import { Type } from "@/components/primitives/type";
import { NationalityMultiPicker } from "@/components/compositions/community/create-composer/nationality-picker";
import { MAX_PAYOUT_TIERS } from "@/lib/rewards/boost-plan";
import { cn } from "@/lib/utils";

/**
 * Presentational surfaces for the "daily_accrual" reward model (see boost-plan.ts):
 * a per-person, per-day reward for studying/karaoke-ing a song. A future
 * "prize_pool" model (e.g. a remix contest) is a different shape and gets its
 * own surface rather than more props on this one.
 */

type BoostCampaignSheetState =
  | "compose"
  | "quote"
  | "confirming"
  | "awaiting-finality"
  | "active"
  | "funding-review"
  | "failed";

export type BoostEligibleActivity = "study" | "karaoke" | "either";

/**
 * One row of the dark nationality-tier preview: a set of ISO-3166 alpha-3
 * nationalities and the raw USD amount input for that tier. The sheet never
 * mints `id`s — the owner (story, or the controller once Phase 1 lands) creates
 * rows so tests and stories stay deterministic.
 */
export interface BoostPayoutTierDraft {
  id: string;
  nationalities: string[];
  amountLabel: string;
}

export interface BoostCampaignSheetProps {
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
  eligibleActivity: BoostEligibleActivity;
  eligibleActivities?: BoostEligibleActivity[];
  errorMessage?: string;
  /** Funding-transaction link on the settlement chain's explorer (Base or Base Sepolia). */
  explorerTxUrl?: string;
  endsAtLabel?: string;
  forceMobile?: boolean;
  fundingAmountLabel?: string;
  fundedLabel?: string;
  /**
   * Dark nationality-tier preview. The section renders ONLY when this prop is
   * present (even as []); undefined keeps the pre-tier sheet exactly. Nothing
   * here reaches the API — payout tiers have no contract fields until Phase 1
   * lands, so the production controller never passes this.
   */
  payoutTiers?: BoostPayoutTierDraft[];
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
  onBudgetChange?: (value: string) => void;
  onConfirm?: () => void;
  /** Recovery action offered when the pinned funding wallet is not connected. */
  onConnectWallet?: () => void;
  onDailyRewardChange?: (value: string) => void;
  onEligibleActivityChange?: (value: BoostEligibleActivity) => void;
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

/** Radio-card titles for the exclusive eligible-activity enum; "or" keeps OR semantics explicit. */
const ACTIVITY_TITLE = {
  karaoke: "Karaoke",
  study: "Study",
  either: "Karaoke or study",
} satisfies Record<BoostEligibleActivity, string>;

function CampaignSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-soft py-3 last:border-b-0">
      <Type as="div" className="text-muted-foreground" variant="body">
        {label}
      </Type>
      <Type as="div" className="tabular-nums" variant="body-strong">
        {value}
      </Type>
    </div>
  );
}

function MoneyInput({
  describedBy,
  id,
  invalid,
  onChange,
  value,
}: {
  describedBy?: string;
  id: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
  value: string;
}) {
  return (
    <div className="relative">
      <Type as="span" className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-muted-foreground" variant="body">
        $
      </Type>
      <Input
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="pl-8"
        id={id}
        inputMode="decimal"
        onChange={(event) => onChange?.(event.target.value)}
        value={value}
      />
    </div>
  );
}

export function BoostCampaignSheet({
  busy,
  budgetDisplayLabel,
  budgetLabel,
  budgetPresets,
  canRestartFunding,
  dailyRewardLabel,
  dailyRewardDisplayLabel,
  eligibleActivity,
  eligibleActivities = ["karaoke", "study", "either"],
  endsAtLabel,
  errorMessage,
  explorerTxUrl,
  forceMobile,
  fundingAmountLabel,
  fundedLabel,
  payoutTiers,
  maxPayoutTiers = MAX_PAYOUT_TIERS,
  onAddPayoutTier,
  onRemovePayoutTier,
  onPayoutTierNationalitiesChange,
  onPayoutTierAmountChange,
  maxClaimDisplayLabel,
  tierRangeLabel,
  onBudgetChange,
  onConfirm,
  onConnectWallet,
  onDailyRewardChange,
  onEligibleActivityChange,
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
  walletMismatch,
  walletMismatchReason = "no-wallet",
}: BoostCampaignSheetProps) {
  const activityLabelId = React.useId();
  const rewardDisplay = dailyRewardDisplayLabel ?? dailyRewardLabel;
  // The tier section renders only when the owner passes `payoutTiers` (even as
  // []); `tiered` (at least one row) flips budget math to worst-case display.
  const showPayoutTiers = payoutTiers != null;
  const tiered = showPayoutTiers && payoutTiers.length > 0;
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
          <ModalTitle>Boost this song</ModalTitle>
          <ModalDescription className="text-muted-foreground">
            Put up rewards for people who practice this song.
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
            <label className="block" htmlFor="boost-daily-reward">
              <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                {showPayoutTiers ? "Default daily reward" : "Daily reward per learner"}
              </Type>
              <MoneyInput
                id="boost-daily-reward"
                onChange={onDailyRewardChange}
                value={dailyRewardLabel}
              />
            </label>
            <div>
              <label className="block" htmlFor="boost-budget">
                <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                  Total budget
                </Type>
                <MoneyInput
                  describedBy={planProblem ? "boost-plan-problem" : undefined}
                  id="boost-budget"
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

            {payoutTiers != null ? (
              <section aria-labelledby={payoutTiersLabelId} ref={setTierPortalContainer}>
                <Type as="span" className="mb-2 block text-muted-foreground" id={payoutTiersLabelId} variant="label">
                  Payout by nationality
                </Type>
                <Type as="p" className="mb-3 text-muted-foreground" variant="caption">
                  Verified nationalities earn their tier's amount; everyone else earns the default.
                </Type>
                <div className="space-y-3">
                  {payoutTiers.map((tier, index) => (
                    <div className="space-y-2 rounded-lg border border-border-soft p-3" key={tier.id}>
                      <div className="flex items-center justify-between gap-2">
                        <Type as="span" className="text-muted-foreground" variant="label">
                          Tier {index + 1}
                        </Type>
                        <IconButton
                          aria-label={`Remove tier ${index + 1}`}
                          onClick={() => onRemovePayoutTier?.(tier.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <X aria-hidden="true" className="size-5" weight="bold" />
                        </IconButton>
                      </div>
                      <NationalityMultiPicker
                        inputAriaLabel="Search countries"
                        noResultsLabel="No countries found"
                        onChange={(codes) => onPayoutTierNationalitiesChange?.(tier.id, codes)}
                        placeholder="Countries in this tier"
                        portalContainer={tierPortalContainer}
                        values={tier.nationalities}
                      />
                      <label className="block" htmlFor={`boost-tier-amount-${tier.id}`}>
                        <Type as="span" className="sr-only">
                          Tier {index + 1} amount
                        </Type>
                        <MoneyInput
                          id={`boost-tier-amount-${tier.id}`}
                          onChange={(value) => onPayoutTierAmountChange?.(tier.id, value)}
                          value={tier.amountLabel}
                        />
                      </label>
                    </div>
                  ))}
                  <Button
                    className="h-10 w-full"
                    disabled={payoutTiers.length >= maxPayoutTiers}
                    onClick={onAddPayoutTier}
                    type="button"
                    variant="outline"
                  >
                    Add a tier
                  </Button>
                </div>
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-border-soft bg-muted/30 p-4">
                  <ShieldWarning aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" weight="fill" />
                  <Type as="p" className="text-muted-foreground" variant="body">
                    Payout amounts are publicly visible on-chain and differ by tier.
                  </Type>
                </div>
              </section>
            ) : null}

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
              <>
                <div className="rounded-lg border border-border-soft px-4">
                  {/* Untiered: `Up to` — a ceiling, since zero is possible if nobody
                      practises. Tiered: `At least` — a guaranteed floor, because loss
                      bounds assume the top tier amount on every claim. */}
                  <CampaignSummaryRow
                    label="Pays for"
                    value={tiered ? `At least ${rewardCountLabel}` : `Up to ${rewardCountLabel}`}
                  />
                </div>

                <Type as="p" className="text-muted-foreground" variant="caption">
                  {tiered
                    ? `Worst case assumes the top tier${maxClaimDisplayLabel ? ` (${maxClaimDisplayLabel})` : ""} on every claim. You pay ${budgetDisplayLabel} now. The reward and budget lock after payment, and unused funds can't be withdrawn.`
                    : `You pay ${budgetDisplayLabel} now. The reward and budget lock after payment, and unused funds can't be withdrawn.`}
                </Type>
              </>
            )}
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
                label="Reward per day"
                value={tiered && tierRangeLabel ? tierRangeLabel : rewardDisplay}
              />
              <CampaignSummaryRow
                label="Pays for"
                value={tiered ? `At least ${rewardCountLabel}` : `Up to ${rewardCountLabel}`}
              />
            </div>

            {walletMismatch ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" />
                  <Type as="p" className="text-destructive" variant="body">
                    {walletMismatchReason === "different-wallet"
                      ? "A different wallet is connected. This boost can only be paid from your Pirate Wallet."
                      : "Connect your Pirate Wallet to pay. This boost was prepared for that wallet."}
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

        {state === "confirming" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                Confirming your funding
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                The boost activates once the network confirms the transfer.
              </Type>
            </div>
          </div>
        ) : null}

        {state === "awaiting-finality" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                Funding submitted
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                Your transfer is safe while the network reaches finality. Do not send again.
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
                  Boost is live
                </Type>
                <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                  People can now earn {rewardDisplay} for {ACTIVITY_LABEL[eligibleActivity]}.
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
            {explorerTxUrl ? (
              <Button asChild className="mt-4 h-11 w-full" variant="outline">
                <a href={explorerTxUrl} rel="noreferrer" target="_blank">
                  View funding transaction
                  <ArrowSquareOut aria-hidden="true" className="size-4" weight="bold" />
                </a>
              </Button>
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
                {errorMessage ?? "We could not start the boost. No payment was sent."}
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
                  {errorMessage ?? "Funds arrived, but the boost didn't activate. Don't send again; we'll review or refund."}
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
            {explorerTxUrl ? (
              <Button asChild className="mt-4 h-11 w-full" variant="outline">
                <a href={explorerTxUrl} rel="noreferrer" target="_blank">
                  View funding transaction
                  <ArrowSquareOut aria-hidden="true" className="size-4" weight="bold" />
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}

        <ModalFooter className="mt-6">
          {state === "compose" ? (
            <Button className="h-12 w-full" disabled={Boolean(planProblem) || busy} onClick={onConfirm}>
              Review funding
            </Button>
          ) : null}
          {state === "quote" ? (
            <Button className="h-12 w-full" disabled={Boolean(walletMismatch) || busy} onClick={onConfirm}>
              Pay {fundingAmountLabel}
            </Button>
          ) : null}
          {state === "confirming" || state === "awaiting-finality" ? (
            <Button className="h-12 w-full" disabled={busy} onClick={onRefresh} variant="outline">
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
          <ModalTitle>Reward settings</ModalTitle>
          <ModalDescription>
            Choose whether other people can fund practice rewards for this song.
          </ModalDescription>
        </ModalHeader>
        <div className="mt-5 rounded-lg border border-border-soft p-4">
          <div className="flex items-center justify-between gap-4">
            <Type as="div" id={policyLabelId} variant="body-strong">
              Allow others to boost this song
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
              Blocking pauses third-party reward campaigns. Campaign funding is not returned.
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
