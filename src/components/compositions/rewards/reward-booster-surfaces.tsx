"use client";

import * as React from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Confetti,
  CurrencyDollar,
  HourglassMedium,
  Lock,
  Megaphone,
  Prohibit,
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
  | "quote"
  | "confirming"
  | "active"
  | "expired"
  | "funding-review"
  | "failed";

type CampaignStatusState =
  | "scheduled"
  | "active"
  | "paused"
  | "operational-hold"
  | "exhausted"
  | "ended"
  | "canceled";

type BoostBlockedReason =
  | "owner-opted-out"
  | "campaign-exists"
  | "rate-limited";

export type BoostEligibleActivity = "study" | "karaoke" | "either";

interface BoostSongButtonProps {
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export interface BoostCampaignSheetProps {
  budgetLabel: string;
  /** Preset budgets offered as one-tap chips, already formatted (e.g. "$25.00"). */
  budgetPresets?: string[];
  chainLabel: string;
  dailyRewardLabel: string;
  eligibleActivity: BoostEligibleActivity;
  eligibleActivities?: BoostEligibleActivity[];
  errorMessage?: string;
  /** Funding-transaction link on the settlement chain's explorer (Base or Base Sepolia). */
  explorerTxUrl?: string;
  expiresInLabel?: string;
  forceMobile?: boolean;
  fundingAmountLabel?: string;
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
  supportReference?: string;
  /**
   * The wallet the quote is pinned to. Funding MUST originate from this address
   * or receipt verification rejects it and the transfer is stranded, so it is
   * shown prominently and the send action is blocked when the connected wallet
   * differs (see {@link walletMismatch}).
   */
  senderAddressLabel?: string;
  state: BoostCampaignSheetState;
  treasuryAddress?: string;
  /** True when the connected wallet is not {@link senderAddressLabel}; blocks the send. */
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

export interface CampaignStatusCardProps {
  budgetLabel: string;
  className?: string;
  dailyRewardLabel: string;
  endsAtLabel?: string;
  onViewDetails?: () => void;
  remainingLabel: string;
  rewardsPaidLabel: string;
  spentLabel: string;
  state: CampaignStatusState;
}

export interface BoostEligibilityNoticeProps {
  className?: string;
  onRetry?: () => void;
  reason: BoostBlockedReason;
  retryInLabel?: string;
}

const ACTIVITY_LABEL = {
  study: "a study set",
  karaoke: "a karaoke pass",
  either: "a study set or karaoke pass",
} satisfies Record<BoostEligibleActivity, string>;

function BoostSongButton({ className, disabled, onClick }: BoostSongButtonProps) {
  return (
    <Button className={cn("h-11", className)} disabled={disabled} onClick={onClick} variant="outline">
      <Megaphone aria-hidden="true" className="size-4 text-primary" weight="bold" />
      Boost this song
    </Button>
  );
}

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

export function BoostCampaignSheet({
  budgetLabel,
  budgetPresets,
  chainLabel,
  dailyRewardLabel,
  eligibleActivity,
  eligibleActivities = ["karaoke", "study", "either"],
  errorMessage,
  explorerTxUrl,
  expiresInLabel,
  forceMobile,
  fundingAmountLabel,
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
  senderAddressLabel,
  state,
  supportReference,
  treasuryAddress,
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
            Fund USDC rewards so learners earn by practising this song.
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
                    {{ karaoke: "Karaoke", study: "Study", either: "Both" }[activity]}
                  </Button>
                ))}
              </div>
            </div>
            <label className="block" htmlFor="boost-daily-reward">
              <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                Reward per learner, per day
              </Type>
              <Input
                id="boost-daily-reward"
                inputMode="decimal"
                onChange={(event) => onDailyRewardChange?.(event.target.value)}
                value={dailyRewardLabel}
              />
            </label>
            <div>
              <label className="block" htmlFor="boost-budget">
                <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                  Total budget
                </Type>
                <Input
                  aria-describedby={planProblem ? "boost-plan-problem" : undefined}
                  aria-invalid={planProblem ? true : undefined}
                  id="boost-budget"
                  inputMode="decimal"
                  onChange={(event) => onBudgetChange?.(event.target.value)}
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
                  You only pay for rewards people actually earn. Rewards are paid out as they are
                  claimed — funding is final and any budget that goes unspent is not currently refundable.
                </Type>
              </>
            )}

            <div className="flex items-start gap-3 rounded-lg border border-border-soft bg-muted/30 p-4">
              <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" weight="bold" />
              <Type as="p" className="text-muted-foreground" variant="body">
                Terms are locked once funded. The reward rate and budget cannot be changed afterwards,
                and funding cannot be withdrawn.
              </Type>
            </div>
          </div>
        ) : null}

        {state === "quote" ? (
          <div className="mt-5 space-y-4">
            <Card className="border-primary/30 bg-primary-subtle p-4 shadow-none">
              <Type as="div" className="text-muted-foreground" variant="overline">
                Send exactly
              </Type>
              <Type as="div" className="mt-0.5 tabular-nums" variant="h1">
                {fundingAmountLabel}
              </Type>
              <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
                A different amount will not activate the campaign.
              </Type>
            </Card>

            <div>
              <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                To this address on {chainLabel}
              </Type>
              <CopyField value={treasuryAddress ?? ""} />
            </div>

            <div className="rounded-lg border border-border-soft px-4">
              <CampaignSummaryRow label="Reward per day" value={dailyRewardLabel} />
              <CampaignSummaryRow label="Pays for" value={`Up to ${rewardCountLabel}`} />
              {senderAddressLabel ? <CampaignSummaryRow label="Pays from your wallet" value={senderAddressLabel} /> : null}
              {expiresInLabel ? <CampaignSummaryRow label="Quote expires in" value={expiresInLabel} /> : null}
            </div>

            {walletMismatch ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" />
                <Type as="p" className="text-destructive" variant="body">
                  This quote can only be funded from {senderAddressLabel ?? "your primary wallet"}. Switch to that
                  wallet before sending — a transfer from any other wallet cannot be credited.
                </Type>
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
                  Learners now earn {dailyRewardLabel} for completing {ACTIVITY_LABEL[eligibleActivity]}. They have 7 days to verify and claim each reward.
                </Type>
              </div>
            </div>
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

        {state === "expired" ? (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-border-soft p-4">
            <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" weight="fill" />
            <div>
              <Type as="div" variant="body-strong">
                Quote expired
              </Type>
              <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                No funds were taken. Start again to get a fresh amount and address.
              </Type>
            </div>
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
                {errorMessage ?? "The transfer could not be confirmed. No campaign was created."}
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
              Send from my wallet
            </Button>
          ) : null}
          {state === "confirming" ? (
            <Button className="h-12 w-full" onClick={onRefresh} variant="outline">
              Check status
            </Button>
          ) : null}
          {state === "expired" || state === "failed" ? (
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

export function CampaignStatusCard({
  budgetLabel,
  className,
  dailyRewardLabel,
  endsAtLabel,
  onViewDetails,
  remainingLabel,
  rewardsPaidLabel,
  spentLabel,
  state,
}: CampaignStatusCardProps) {
  // Every backend lifecycle state is representable for DISPLAY, but the card exposes
  // no pause/resume/cancel actions: the API supports no user-driven campaign mutation,
  // so paused and operational-hold are explanatory states, not interactive controls.
  const content = {
    scheduled: {
      icon: <Clock aria-hidden="true" className="size-6" weight="bold" />,
      title: "Scheduled",
      body: "Funded and waiting to start.",
      tone: "text-muted-foreground",
    },
    active: {
      icon: <Megaphone aria-hidden="true" className="size-6" weight="fill" />,
      title: "Boost is live",
      body: `Learners earn ${dailyRewardLabel} per day.`,
      tone: "text-primary",
    },
    paused: {
      icon: <HourglassMedium aria-hidden="true" className="size-6" weight="bold" />,
      title: "Paused",
      body: "No new rewards are being paid right now.",
      tone: "text-muted-foreground",
    },
    // Deliberately does not expose incident internals. The booster is told the truth
    // that matters to them: nothing new is being paid while the accounting is checked.
    "operational-hold": {
      icon: <ShieldWarning aria-hidden="true" className="size-6" weight="fill" />,
      title: "Paused for an integrity check",
      body: "We paused this boost while we verify its accounting. No new rewards are being paid in the meantime.",
      tone: "text-warning",
    },
    exhausted: {
      icon: <Confetti aria-hidden="true" className="size-6" weight="fill" />,
      title: "Fully claimed",
      body: "Every reward you funded has been earned.",
      tone: "text-primary",
    },
    ended: {
      icon: <CheckCircle aria-hidden="true" className="size-6" weight="bold" />,
      title: "Boost ended",
      body: "This campaign has finished.",
      tone: "text-muted-foreground",
    },
    canceled: {
      icon: <Prohibit aria-hidden="true" className="size-6" weight="bold" />,
      title: "Boost canceled",
      body: "This campaign was canceled before it started.",
      tone: "text-muted-foreground",
    },
  } satisfies Record<CampaignStatusState, { body: string; icon: React.ReactNode; title: string; tone: string }>;

  const selected = content[state];

  return (
    <Card className={cn("rounded-lg border-border bg-card p-5 shadow-none", className)}>
      <div className="flex items-start gap-3">
        <div className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-muted", selected.tone)}>
          {selected.icon}
        </div>
        <div className="min-w-0 flex-1">
          <Type as="div" variant="body-strong">
            {selected.title}
          </Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            {selected.body}
          </Type>
        </div>
      </div>

      <div className="mt-4 border-y border-border-soft">
        <CampaignSummaryRow label="Budget" value={budgetLabel} />
        <CampaignSummaryRow label="Spent" value={spentLabel} />
        <CampaignSummaryRow label="Remaining" value={remainingLabel} />
        <CampaignSummaryRow label="Rewards paid" value={rewardsPaidLabel} />
        {endsAtLabel ? <CampaignSummaryRow label="Ends" value={endsAtLabel} /> : null}
      </div>

      {onViewDetails ? (
        <div className="mt-5 flex gap-3">
          <Button className="h-12 flex-1" onClick={onViewDetails} variant="outline">
            View details
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function BoostEligibilityNotice({
  className,
  onRetry,
  reason,
  retryInLabel,
}: BoostEligibilityNoticeProps) {
  const content = {
    "owner-opted-out": {
      icon: <Prohibit aria-hidden="true" className="size-5 text-muted-foreground" weight="bold" />,
      title: "Boosts are turned off for this song",
      body: "The artist has chosen not to accept rewards funded by other people.",
    },
    "campaign-exists": {
      icon: <CurrencyDollar aria-hidden="true" className="size-5 text-primary" weight="bold" />,
      title: "This song is already boosted",
      body: "A live boost is already running. You can fund a new one once it finishes.",
    },
    "rate-limited": {
      icon: <Clock aria-hidden="true" className="size-5 text-muted-foreground" weight="bold" />,
      title: "Too many boosts started",
      body: retryInLabel
        ? `You have started several boosts recently. Try again in ${retryInLabel}.`
        : "You have started several boosts recently. Try again shortly.",
    },
  } satisfies Record<BoostBlockedReason, { body: string; icon: React.ReactNode; title: string }>;

  const selected = content[reason];

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border border-border-soft bg-card p-4 shadow-sm", className)}>
      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-muted">
        {selected.icon}
      </div>
      <div className="min-w-0 flex-1">
        <Type as="div" variant="body-strong">
          {selected.title}
        </Type>
        <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
          {selected.body}
        </Type>
      </div>
      {reason === "rate-limited" && onRetry ? (
        <Button className="h-9 shrink-0" onClick={onRetry} variant="ghost">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
