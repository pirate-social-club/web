"use client";

import * as React from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Confetti,
  CurrencyDollar,
  Fingerprint,
  Gift,
  HourglassMedium,
  QrCode,
  ShieldCheck,
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
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

type RewardEarnedState =
  | "earned-today"
  | "already-earned-today"
  | "daily-cap-reached"
  | "milestone-bonus";

type WalletRewardsCardState =
  | "zero"
  | "accruing"
  | "cashout-ready"
  | "verify-required"
  | "payout-pending"
  | "payout-complete"
  | "error";

export type VerifyHumanSheetState =
  | "intro"
  | "provider-selection"
  | "pending"
  | "success"
  | "failure"
  | "conflict";

export type CashoutSheetState =
  | "amount-entry"
  | "confirm"
  | "pending"
  | "success"
  | "failure";

export interface SongRewardBadgeProps {
  amountLabel: string;
  className?: string;
}

export interface SongRewardOfferProps {
  amountLabel: string;
  className?: string;
  eligibleActivity: "study" | "karaoke" | "either";
  minScoreBps: number;
}

export function rewardAmountLabel(amountCents: number, chainId: number): string {
  const amount = (amountCents / 100).toFixed(2);
  if (chainId === 8453) return `$${amount} USDC`;
  if (chainId === 84532) return `${amount} testnet USDC (Base Sepolia)`;
  return `${amount} USDC (chain ${chainId})`;
}

export function rewardCtaAmountLabel(amountCents: number): string {
  const amount = amountCents / 100;
  return `$${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export interface StreakRewardEarnedProps {
  activityKind?: "karaoke" | "study";
  amountLabel: string;
  className?: string;
  milestoneLabel?: string;
  state: RewardEarnedState;
}

export interface WalletRewardsCardProps {
  availableLabel: string;
  balanceLabel: string;
  className?: string;
  earnedTodayLabel: string;
  errorMessage?: string;
  minimumCashoutLabel: string;
  onCashout?: () => void;
  onRetry?: () => void;
  onVerify?: () => void;
  pendingAmountLabel?: string;
  state: WalletRewardsCardState;
}

export interface VerifyHumanSheetProps {
  forceMobile?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectProvider?: (provider: "self" | "very" | "zkpassport") => void;
  open: boolean;
  state: VerifyHumanSheetState;
}

export interface CashoutSheetProps {
  amountLabel: string;
  availableLabel: string;
  basescanUrl?: string;
  errorMessage?: string;
  forceMobile?: boolean;
  minimumCashoutLabel: string;
  onAmountChange?: (value: string) => void;
  onConfirm?: () => void;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => void;
  open: boolean;
  recipientLabel: string;
  state: CashoutSheetState;
  txHashLabel?: string;
}

function InlinePill({
  children,
  className,
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border border-border-soft bg-card px-3 text-foreground shadow-sm", className)}>
      {icon}
      <Type as="span" className="leading-none" variant="body-strong">
        {children}
      </Type>
    </div>
  );
}

export function SongRewardBadge({ amountLabel, className }: SongRewardBadgeProps) {
  return (
    <InlinePill
      className={className}
      icon={<CurrencyDollar aria-hidden="true" className="size-4 text-primary" weight="bold" />}
    >
      Earn {amountLabel}/day
    </InlinePill>
  );
}

export function SongRewardOffer({
  amountLabel,
  className,
  eligibleActivity,
  minScoreBps,
}: SongRewardOfferProps) {
  const minimumScoreLabel = `${Number((minScoreBps / 100).toFixed(2))}%`;
  const qualificationLabel = {
    study: "Complete today's study set",
    karaoke: `Score at least ${minimumScoreLabel} in Karaoke`,
    either: `Complete a study set or score at least ${minimumScoreLabel} in Karaoke`,
  }[eligibleActivity];

  return (
    <Card className={cn("border-primary/30 bg-primary-subtle p-4 shadow-none", className)}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Gift aria-hidden="true" className="size-5" weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <Type as="div" className="text-muted-foreground" variant="overline">
            Reward
          </Type>
          <Type as="div" variant="h3">
            Earn {amountLabel} per UTC day
          </Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            {qualificationLabel}
          </Type>
        </div>
      </div>
    </Card>
  );
}

export function StreakRewardEarned({
  activityKind = "study",
  amountLabel,
  className,
  milestoneLabel,
  state,
}: StreakRewardEarnedProps) {
  const activityLabel = activityKind === "karaoke" ? "karaoke pass" : "study";
  const content = {
    "earned-today": {
      icon: <CheckCircle aria-hidden="true" className="size-5 text-primary" weight="fill" />,
      title: `${amountLabel} reward pending`,
      body: `Today's ${activityLabel} qualified. Reward credit updates after confirmation.`,
    },
    "already-earned-today": {
      icon: <Clock aria-hidden="true" className="size-5 text-muted-foreground" weight="bold" />,
      title: "Reward already pending",
      body: "You already qualified this song today. Come back tomorrow to keep the streak paying.",
    },
    "daily-cap-reached": {
      icon: <WarningCircle aria-hidden="true" className="size-5 text-warning" weight="fill" />,
      title: "Daily reward cap reached",
      body: "Your streak still counts, but today's reward budget is already used.",
    },
    "milestone-bonus": {
      icon: <Confetti aria-hidden="true" className="size-5 text-primary" weight="fill" />,
      title: `${milestoneLabel ?? "Milestone"} bonus pending`,
      body: `${amountLabel} will be added after this streak milestone is confirmed.`,
    },
  } satisfies Record<RewardEarnedState, { body: string; icon: React.ReactNode; title: string }>;

  const selected = content[state];

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border border-border-soft bg-card p-4 shadow-sm", className)}>
      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-muted">
        {selected.icon}
      </div>
      <div className="min-w-0">
        <Type as="div" variant="body-strong">
          {selected.title}
        </Type>
        <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
          {selected.body}
        </Type>
      </div>
    </div>
  );
}

function RewardSummaryRow({ label, value }: { label: string; value: string }) {
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

export function WalletRewardsCard({
  availableLabel,
  balanceLabel,
  className,
  earnedTodayLabel,
  errorMessage,
  minimumCashoutLabel,
  onCashout,
  onRetry,
  onVerify,
  pendingAmountLabel,
  state,
}: WalletRewardsCardProps) {
  const isCashoutReady = state === "cashout-ready";
  const needsVerify = state === "verify-required";
  const isPending = state === "payout-pending";
  const isComplete = state === "payout-complete";
  const isError = state === "error";

  return (
    <Card className={cn("rounded-lg border-border bg-card p-5 shadow-none", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Type as="div" className="text-muted-foreground" variant="body">
            Rewards
          </Type>
          <Type as="div" className="mt-0.5 text-4xl font-semibold leading-tight tabular-nums" variant="h1">
            {balanceLabel}
          </Type>
        </div>
        <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Gift aria-hidden="true" className="size-6" weight="fill" />
        </div>
      </div>

      <div className="mt-4 border-y border-border-soft">
        <RewardSummaryRow label="Available" value={availableLabel} />
        <RewardSummaryRow label="Earned today" value={earnedTodayLabel} />
        <RewardSummaryRow label="Minimum transfer" value={minimumCashoutLabel} />
        {pendingAmountLabel ? <RewardSummaryRow label="Pending transfer" value={pendingAmountLabel} /> : null}
      </div>

      {state === "zero" ? (
        <Type as="p" className="mt-4 text-muted-foreground" variant="body">
          Study a rewarded song to start earning.
        </Type>
      ) : null}
      {state === "accruing" ? (
        <Type as="p" className="mt-4 text-muted-foreground" variant="body">
          Keep practicing to reach the transfer minimum.
        </Type>
      ) : null}
      {needsVerify ? (
        <Type as="p" className="mt-4 text-muted-foreground" variant="body">
          Verify once to claim rewards.
        </Type>
      ) : null}
      {isPending ? (
        <Type as="p" className="mt-4 text-muted-foreground" variant="body">
          Reward claim is waiting for network confirmation.
        </Type>
      ) : null}
      {isComplete ? (
        <Type as="p" className="mt-4 text-muted-foreground" variant="body">
          Reward was sent to your wallet.
        </Type>
      ) : null}
      {isError ? (
        <Type as="p" className="mt-4 text-destructive" variant="body">
          {errorMessage ?? "Transfer failed. Try again in a moment."}
        </Type>
      ) : null}

      <div className="mt-5 flex gap-3">
        {needsVerify ? (
          <Button className="h-12 flex-1" onClick={onVerify}>
            Verify
          </Button>
        ) : (
          <Button className="h-12 flex-1" disabled={!isCashoutReady || !onCashout} onClick={onCashout}>
            Claim
          </Button>
        )}
        {isError ? (
          <Button className="h-12" onClick={onRetry} variant="outline">
            Retry
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function ProviderButton({
  description,
  icon,
  label,
  onClick,
}: {
  description?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="flex min-h-20 w-full items-center gap-3 rounded-lg border border-border-soft px-4 py-3 text-start transition-colors hover:bg-muted/35"
      onClick={onClick}
      type="button"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <Type as="div" variant="body-strong">
          {label}
        </Type>
        {description ? (
          <Type as="div" className="text-muted-foreground" variant="caption">
            {description}
          </Type>
        ) : null}
      </div>
    </button>
  );
}

export function VerifyHumanSheet({
  forceMobile,
  onOpenChange,
  onSelectProvider,
  open,
  state,
}: VerifyHumanSheetProps) {
  const isTerminal = state === "success" || state === "failure" || state === "conflict";

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
          <ModalTitle>Verify once</ModalTitle>
          <ModalDescription className="text-muted-foreground">
            One person, one rewards account. Pirate does not see your ID.
          </ModalDescription>
        </ModalHeader>

        {state === "intro" ? (
          <div className="mt-5 rounded-lg border border-border-soft bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" weight="fill" />
              <Type as="p" className="text-muted-foreground" variant="body">
                Existing wallet funds are unaffected.
              </Type>
            </div>
          </div>
        ) : null}

        {state === "provider-selection" ? (
          <div className="mt-5 space-y-3">
            <ProviderButton
              icon={<QrCode aria-hidden="true" className="size-5" weight="bold" />}
              label="Self"
              onClick={() => onSelectProvider?.("self")}
            />
            <ProviderButton
              icon={<Fingerprint aria-hidden="true" className="size-5" weight="bold" />}
              label="Very"
              onClick={() => onSelectProvider?.("very")}
            />
            <ProviderButton
              icon={<ShieldCheck aria-hidden="true" className="size-5" weight="bold" />}
              label="ZKPassport"
              onClick={() => onSelectProvider?.("zkpassport")}
            />
          </div>
        ) : null}

        {state === "pending" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                Waiting for proof
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                Finish the provider flow to claim rewards.
              </Type>
            </div>
          </div>
        ) : null}

        {isTerminal ? (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-border-soft p-4">
            {state === "success" ? <CheckCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" weight="fill" /> : null}
            {state === "failure" ? <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" /> : null}
            {state === "conflict" ? <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" weight="fill" /> : null}
            <div>
              <Type as="div" variant="body-strong">
                {state === "success" ? "Verification complete" : null}
                {state === "failure" ? "Verification failed" : null}
                {state === "conflict" ? "Identity already linked" : null}
              </Type>
              <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                {state === "success" ? "You can claim rewards from this account." : null}
                {state === "failure" ? "The provider could not complete the proof. Try another provider or retry." : null}
                {state === "conflict" ? "This proof is already connected to another Pirate account. Use that account or contact support." : null}
              </Type>
            </div>
          </div>
        ) : null}

        <ModalFooter className="mt-6">
          <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)} variant={state === "success" ? "default" : "outline"}>
            {state === "success" ? "Done" : "Close"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function CashoutSheet({
  amountLabel,
  availableLabel,
  basescanUrl,
  errorMessage,
  forceMobile,
  minimumCashoutLabel,
  onAmountChange,
  onConfirm,
  onOpenChange,
  onRefresh,
  open,
  recipientLabel,
  state,
  txHashLabel,
}: CashoutSheetProps) {
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
          <ModalTitle>Claim rewards</ModalTitle>
          <ModalDescription className="text-muted-foreground">
            Sends rewards to your wallet.
          </ModalDescription>
        </ModalHeader>

        {state === "amount-entry" || state === "confirm" ? (
          <div className="mt-5 space-y-4">
            <label className="block" htmlFor="reward-cashout-amount">
              <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                Amount
              </Type>
              <Input
                id="reward-cashout-amount"
                inputMode="decimal"
                onChange={(event) => onAmountChange?.(event.target.value)}
                readOnly={state === "confirm"}
                value={amountLabel}
              />
            </label>
            <div className="rounded-lg border border-border-soft px-4">
              <RewardSummaryRow label="Available" value={availableLabel} />
              <RewardSummaryRow label="Minimum" value={minimumCashoutLabel} />
              <RewardSummaryRow label="Recipient" value={recipientLabel} />
            </div>
          </div>
        ) : null}

        {state === "pending" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                Payout submitted
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                Waiting for network confirmation.
              </Type>
            </div>
          </div>
        ) : null}

        {state === "success" ? (
          <div className="mt-6 rounded-lg border border-border-soft p-4">
            <div className="flex items-start gap-3">
              <CheckCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" weight="fill" />
              <div>
                <Type as="div" variant="body-strong">
                  Claim complete
                </Type>
                <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                  {amountLabel} was sent to {recipientLabel}.
                </Type>
              </div>
            </div>
            {basescanUrl ? (
              <Button asChild className="mt-4 h-11 w-full" variant="outline">
                <a href={basescanUrl} rel="noreferrer" target="_blank">
                  View on Basescan
                  <ArrowSquareOut aria-hidden="true" className="size-4" weight="bold" />
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}

        {state === "failure" ? (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-border-soft p-4">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" weight="fill" />
            <div>
              <Type as="div" variant="body-strong">
                Transfer failed
              </Type>
              <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                {errorMessage ?? "The transfer could not be submitted. Try again in a moment."}
              </Type>
            </div>
          </div>
        ) : null}

        {txHashLabel && state !== "amount-entry" ? (
          <Type as="div" className="mt-4 truncate rounded-lg bg-muted px-3 py-2 font-mono text-muted-foreground" variant="caption">
            {txHashLabel}
          </Type>
        ) : null}

        <ModalFooter className="mt-6">
          {state === "confirm" ? (
            <Button className="h-12 w-full" onClick={onConfirm}>
              Confirm claim
            </Button>
          ) : null}
          {state === "amount-entry" ? (
            <Button className="h-12 w-full" onClick={onConfirm}>
              Continue
            </Button>
          ) : null}
          {state === "pending" ? (
            <Button className="h-12 w-full" onClick={onRefresh} variant="outline">
              Check status
            </Button>
          ) : null}
          {state === "success" || state === "failure" ? (
            <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)} variant={state === "success" ? "default" : "outline"}>
              {state === "success" ? "Done" : "Close"}
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
