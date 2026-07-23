"use client";

import * as React from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Confetti,
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

export type VerifyHumanSheetState =
  | "intro"
  | "provider-selection"
  | "pending"
  | "success"
  | "failure"
  | "conflict";

export type CashoutSheetState =
  | "confirm"
  | "pending"
  | "success"
  | "failure";

export interface SongRewardOfferProps {
  amountLabel: string;
  className?: string;
  eligibleActivity: "study" | "karaoke" | "either";
  minScoreBps: number;
}

export interface RewardQualificationNoticeProps {
  amountLabel: string;
  className?: string;
  expiresAt?: number | null;
  outcomeReason?: "campaign_ended" | "budget_unavailable" | "identity_duplicate" | "owner_blocked" | "score" | "verification_window_expired" | null;
  status: "checking" | "delayed" | "pending_verification" | "credited" | "expired" | "unavailable";
  testMode?: boolean;
}

export function displayedRewardQualificationStatus(
  status: Exclude<RewardQualificationNoticeProps["status"], "delayed"> | null | undefined,
  pollingTimedOut: boolean,
): RewardQualificationNoticeProps["status"] {
  if (pollingTimedOut && (status == null || status === "checking")) return "delayed";
  return status ?? "checking";
}

export function rewardAmountLabel(amountCents: number, chainId: number): string {
  void chainId;
  return rewardCtaAmountLabel(amountCents);
}

export function rewardCtaAmountLabel(amountCents: number): string {
  const amount = amountCents / 100;
  return `$${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export interface VerifyHumanSheetProps {
  forceMobile?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectProvider?: (provider: "self" | "very" | "zkpassport") => void;
  open: boolean;
  providers: readonly ("self" | "very" | "zkpassport")[];
  state: VerifyHumanSheetState;
}

export interface CashoutSheetProps {
  amountLabel: string;
  availableLabel: string;
  basescanUrl?: string;
  errorMessage?: string;
  forceMobile?: boolean;
  minimumCashoutLabel: string;
  onConfirm?: () => void;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => void;
  open: boolean;
  recipientLabel: string;
  state: CashoutSheetState;
  txHashLabel?: string;
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
            Earn {amountLabel} today
          </Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
            {qualificationLabel}. Resets daily.
          </Type>
        </div>
      </div>
    </Card>
  );
}

export function RewardQualificationNotice({
  amountLabel,
  className,
  expiresAt,
  outcomeReason,
  status,
  testMode = false,
}: RewardQualificationNoticeProps) {
  const daysLeft = expiresAt == null
    ? null
    : Math.max(1, Math.ceil((expiresAt * 1_000 - Date.now()) / 86_400_000));
  const unavailableCopy = {
    budget_unavailable: "Today's rewards have all been claimed.",
    campaign_ended: "This boost has ended.",
    identity_duplicate: "You already got this song's reward today.",
    owner_blocked: "Rewards are unavailable for this song.",
    score: "Your score was below the reward target.",
    verification_window_expired: "The time to claim this reward ended.",
  }[outcomeReason ?? "campaign_ended"];
  const content = {
    checking: {
      icon: <HourglassMedium aria-hidden="true" className="size-6 text-primary" weight="duotone" />,
      title: `Checking your ${amountLabel} reward…`,
      body: "This usually takes less than a minute.",
    },
    delayed: {
      icon: <Clock aria-hidden="true" className="size-6 text-primary" weight="duotone" />,
      title: "Still checking your reward",
      body: "You can leave this screen. The result will appear in your Wallet.",
    },
    pending_verification: {
      icon: <Fingerprint aria-hidden="true" className="size-6 text-primary" weight="duotone" />,
      title: `${amountLabel} pending`,
      body: daysLeft == null
        ? "Verify to claim it."
        : `Verify within ${daysLeft} ${daysLeft === 1 ? "day" : "days"} to claim it.`,
    },
    credited: {
      icon: <Confetti aria-hidden="true" className="size-6 text-primary" weight="fill" />,
      title: `+${amountLabel} 🎉`,
      body: "Added to your rewards.",
    },
    expired: {
      icon: <Clock aria-hidden="true" className="size-6 text-muted-foreground" weight="bold" />,
      title: "Reward expired",
      body: unavailableCopy,
    },
    unavailable: {
      icon: <WarningCircle aria-hidden="true" className="size-6 text-muted-foreground" weight="fill" />,
      title: "No reward this time",
      body: unavailableCopy,
    },
  } satisfies Record<RewardQualificationNoticeProps["status"], { body: string; icon: React.ReactNode; title: string }>;
  const selected = content[status];

  return (
    <Card className={cn("border-primary/30 bg-primary-subtle p-4 text-center shadow-none", className)}>
      <div className="mx-auto mb-2 grid size-11 place-items-center rounded-full bg-background">
        {selected.icon}
      </div>
      <Type as="p" variant="h3">{selected.title}</Type>
      <Type as="p" className="mt-1 text-muted-foreground" variant="caption">{selected.body}</Type>
      {testMode ? (
        <Type as="p" className="mt-2 text-muted-foreground" variant="caption">
          Test reward — no cash value.
        </Type>
      ) : null}
    </Card>
  );
}

function RewardSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-soft py-3 last:border-b-0">
      <Type as="div" className="text-muted-foreground" variant="body">{label}</Type>
      <Type as="div" className="tabular-nums" variant="body-strong">{value}</Type>
    </div>
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
  providers,
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
            {providers.includes("self") ? (
              <ProviderButton
                icon={<QrCode aria-hidden="true" className="size-5" weight="bold" />}
                label="Self"
                onClick={() => onSelectProvider?.("self")}
              />
            ) : null}
            {providers.includes("very") ? (
              <ProviderButton
                icon={<Fingerprint aria-hidden="true" className="size-5" weight="bold" />}
                label="Very"
                onClick={() => onSelectProvider?.("very")}
              />
            ) : null}
            {providers.includes("zkpassport") ? (
              <ProviderButton
                icon={<ShieldCheck aria-hidden="true" className="size-5" weight="bold" />}
                label="ZKPassport"
                onClick={() => onSelectProvider?.("zkpassport")}
              />
            ) : null}
          </div>
        ) : null}

        {state === "pending" ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <div>
              <Type as="div" variant="body-strong">
                {providers[0] === "self" ? "Waiting for the Self app…" : "Waiting for verification…"}
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                Finish the check on your phone.
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
                {state === "failure" ? "We could not verify you. Close this message and try again." : null}
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

        {state === "confirm" ? (
          <div className="mt-5 space-y-4">
            <label className="block" htmlFor="reward-cashout-amount">
              <Type as="span" className="mb-2 block text-muted-foreground" variant="label">
                Amount
              </Type>
              <Input
                id="reward-cashout-amount"
                inputMode="decimal"
                readOnly
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
                Sending your {amountLabel}…
              </Type>
              <Type as="div" className="text-muted-foreground" variant="caption">
                Usually under a minute.
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
                  {amountLabel} is in your wallet 🎉
                </Type>
                <Type as="div" className="mt-1 text-muted-foreground" variant="body">
                  Reward sent successfully.
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

        {txHashLabel ? (
          <details className="mt-4 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
            <summary className="cursor-pointer font-medium">Details</summary>
            <Type as="div" className="mt-2 truncate font-mono" variant="caption">{txHashLabel}</Type>
          </details>
        ) : null}

        <ModalFooter className="mt-6">
          {state === "confirm" ? (
            <Button className="h-12 w-full" onClick={onConfirm}>
              Confirm claim
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
