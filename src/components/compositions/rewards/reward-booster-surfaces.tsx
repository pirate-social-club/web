"use client";

import {
  ArrowSquareOut,
  CheckCircle,
  HourglassMedium,
  Lock,
  ShieldWarning,
  WarningCircle,
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
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

/**
 * Presentational surfaces for the "daily_accrual" reward model (see boost-plan.ts):
 * a per-person, per-day reward for studying/karaoke-ing a song. A future
 * "prize_pool" model (e.g. a remix contest) is a different shape and gets its
 * own surface rather than more props on this one.
 */

type BoostCampaignSheetState =
  | "compose"
  | "preparing"
  | "quote"
  | "confirming"
  | "active"
  | "expired"
  | "funding-review"
  | "failed";

export type BoostEligibleActivity = "study" | "karaoke" | "either";

export interface BoostCampaignSheetProps {
  budgetDisplayLabel: string;
  budgetLabel: string;
  /** Preset budgets offered as one-tap chips, already formatted (e.g. "$25.00"). */
  budgetPresets?: string[];
  dailyRewardLabel: string;
  eligibleActivity: BoostEligibleActivity;
  eligibleActivities?: BoostEligibleActivity[];
  errorMessage?: string;
  /** Funding-transaction link on the settlement chain's explorer (Base or Base Sepolia). */
  explorerTxUrl?: string;
  endsAtLabel?: string;
  forceMobile?: boolean;
  fundingAmountLabel?: string;
  fundedLabel?: string;
  onBudgetChange?: (value: string) => void;
  onConfirm?: () => void;
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
  budgetDisplayLabel,
  budgetLabel,
  budgetPresets,
  dailyRewardLabel,
  eligibleActivity,
  eligibleActivities = ["karaoke", "study", "either"],
  endsAtLabel,
  errorMessage,
  explorerTxUrl,
  forceMobile,
  fundingAmountLabel,
  fundedLabel,
  onBudgetChange,
  onConfirm,
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
}: BoostCampaignSheetProps) {
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
              <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                People earn by
              </Type>
              <div className="grid grid-cols-3 gap-2">
                {eligibleActivities.map((activity) => (
                  <Button
                    className="h-10"
                    key={activity}
                    onClick={() => onEligibleActivityChange?.(activity)}
                    type="button"
                    variant={eligibleActivity === activity ? "secondary" : "outline"}
                  >
                    {{ karaoke: "Karaoke", study: "Study", either: "Either" }[activity]}
                  </Button>
                ))}
              </div>
            </div>
            <label className="block" htmlFor="boost-daily-reward">
              <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                Reward per learner, per day
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
                  <CampaignSummaryRow label="Qualifies by" value={`Completing ${ACTIVITY_LABEL[eligibleActivity]}`} />
                  {/* `Up to`, not a bare count: zero is possible if nobody practises, and the
                      decision record reserves plain counts for guaranteed floors. */}
                  <CampaignSummaryRow label="Pays for" value={`Up to ${rewardCountLabel}`} />
                  <CampaignSummaryRow label="Limit" value="One reward per person, per day" />
                </div>

                <Type as="p" className="text-muted-foreground" variant="caption">
                  You pay {budgetDisplayLabel} now. Up to {rewardCountLabel} can be earned.
                  Unused money cannot be withdrawn yet.
                </Type>
              </>
            )}

            <div className="flex items-start gap-3 rounded-lg border border-border-soft bg-muted/30 p-4">
              <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" weight="bold" />
              <Type as="p" className="text-muted-foreground" variant="body">
                The reward and budget cannot be changed after you pay.
              </Type>
            </div>
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
              <CampaignSummaryRow label="Reward per day" value={dailyRewardLabel} />
              <CampaignSummaryRow label="Pays for" value={`Up to ${rewardCountLabel}`} />
            </div>

            {walletMismatch ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" />
                <Type as="p" className="text-destructive" variant="body">
                  Connect your Pirate Wallet to continue. Do not pay from a different wallet.
                </Type>
              </div>
            ) : null}
          </div>
        ) : null}

        {state === "preparing" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                Preparing funding
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                Checking the amount, payment wallet, and destination.
              </Type>
            </div>
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
                The campaign activates once the transfer reaches a safe block.
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
                  People can now earn {dailyRewardLabel} for {ACTIVITY_LABEL[eligibleActivity]}.
                </Type>
              </div>
            </div>
            {fundedLabel && rewardsPaidLabel && remainingLabel ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3">
                {[
                  ["Funded", fundedLabel],
                  ["Earned", rewardsPaidLabel],
                  ["Left", remainingLabel],
                  ["Each", dailyRewardLabel],
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
                  {errorMessage ?? "Your transfer reached a terminal funding state. Refund or support review is required."}
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
            <Button className="h-12 w-full" disabled={Boolean(planProblem)} onClick={onConfirm}>
              Review funding
            </Button>
          ) : null}
          {state === "quote" ? (
            <Button className="h-12 w-full" disabled={Boolean(walletMismatch)} onClick={onConfirm}>
              Pay {fundingAmountLabel}
            </Button>
          ) : null}
          {state === "preparing" ? (
            <Button className="h-12 w-full" disabled>
              Preparing…
            </Button>
          ) : null}
          {state === "confirming" ? (
            <Button className="h-12 w-full" onClick={onRefresh} variant="outline">
              Check status
            </Button>
          ) : null}
          {state === "failed" ? (
            <Button className="h-12 w-full" onClick={onRetry} variant="outline">
              {retryLabel ?? "Start again"}
            </Button>
          ) : null}
          {state === "active" ? (
            <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)}>
              Done
            </Button>
          ) : null}
          {state === "funding-review" ? (
            <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)}>
              Done
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
          <Type as="div" variant="body-strong">Allow others to boost this song</Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="body">
            Turning this off pauses third-party reward campaigns. Campaign funding is not returned.
          </Type>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              disabled={busy}
              onClick={() => onAllowThirdPartyRewardsChange?.(true)}
              variant={allowThirdPartyRewards ? "secondary" : "outline"}
            >
              Allow
            </Button>
            <Button
              disabled={busy}
              onClick={() => onAllowThirdPartyRewardsChange?.(false)}
              variant={!allowThirdPartyRewards ? "secondary" : "outline"}
            >
              Block
            </Button>
          </div>
        </div>
        {errorMessage ? <Type as="p" className="mt-3 text-destructive" variant="body">{errorMessage}</Type> : null}
        <ModalFooter className="mt-6">
          <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)} variant="outline">Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
