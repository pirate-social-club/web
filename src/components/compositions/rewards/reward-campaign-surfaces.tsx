"use client";

import * as React from "react";
import {
  CheckCircle,
  Clock,
  CurrencyDollar,
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

export type CampaignSongBadgeState = "no-campaign" | "unverified" | "verified" | "nearly-exhausted" | "exhausted";
export type CampaignPracticeState =
  | "verify-to-earn"
  | "pending-credit"
  | "credited"
  | "cap-reached"
  | "exhausted";
export type CampaignVerificationState = "providers" | "missing-nationality" | "pending" | "retro-credit" | "conflict";
export type CampaignFundingState = "quote" | "confirming" | "confirmed" | "failed";

export interface RewarderCampaignAdjustedLevel {
  countriesHint: string;
  countriesTitle?: string;
  dailyLabel: string;
  milestone30Label: string;
  milestone7Label: string;
}

export interface SongCampaignRewardBadgeProps {
  exactRateLabel?: string;
  floorRateLabel: string;
  rangeLabel: string;
  remainingLabel?: string;
  state: CampaignSongBadgeState;
}

export interface CampaignDailyProgressChipProps {
  attemptsToday: number;
  qualified?: boolean;
  targetCount: number;
}

export interface CampaignPracticeCalloutProps {
  amountLabel?: string;
  retroDaysLabel?: string;
  state: CampaignPracticeState;
}

export interface CampaignVerificationSheetProps {
  forceMobile?: boolean;
  onOpenChange?: (open: boolean) => void;
  open: boolean;
  state: CampaignVerificationState;
}

export interface RewarderCampaignFormProps {
  adjustedLevels: RewarderCampaignAdjustedLevel[];
  baseDailyValue: string;
  baseMilestone30Value: string;
  baseMilestone7Value: string;
  budgetValue: string;
  durationValue: string;
  fundLabel: string;
  summaryHint: string;
}

export interface CampaignFundingPanelProps {
  amountLabel: string;
  forceMobile?: boolean;
  onOpenChange?: (open: boolean) => void;
  open: boolean;
  paymentAddressLabel: string;
  state: CampaignFundingState;
}

export interface RewarderCampaignDashboardProps {
  creditedLabel: string;
  remainingLabel: string;
  statusLabel: string;
}

function StatusPill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
        tone === "default" && "border-primary/30 bg-primary/10 text-primary",
        tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "muted" && "border-border-soft bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function SongCampaignRewardBadge({
  exactRateLabel,
  floorRateLabel,
  rangeLabel,
  remainingLabel,
  state,
}: SongCampaignRewardBadgeProps) {
  if (state === "no-campaign") {
    return <StatusPill tone="muted">Practice streak</StatusPill>;
  }

  if (state === "exhausted") {
    return <StatusPill tone="muted">Reward ended</StatusPill>;
  }

  const rateLabel = state === "unverified" ? rangeLabel : exactRateLabel ?? floorRateLabel;

  return (
    <div className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-border-soft bg-card px-3 shadow-sm">
      <CurrencyDollar aria-hidden="true" className="size-4 shrink-0 text-primary" weight="bold" />
      <Type as="span" className="truncate text-sm font-semibold" variant="caption">
        {`Practice reward: ${rateLabel}`}
      </Type>
      {state === "nearly-exhausted" && remainingLabel ? <StatusPill tone="warn">{remainingLabel} left</StatusPill> : null}
    </div>
  );
}

function ProgressRing({
  children,
  progress,
  tone,
}: {
  children: React.ReactNode;
  progress: number;
  tone: "active" | "complete";
}) {
  const radius = 15.5;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <span className="relative inline-grid size-9 shrink-0 place-items-center">
      <svg aria-hidden="true" className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
        <circle className="text-border-soft" cx="18" cy="18" fill="none" r={radius} stroke="currentColor" strokeWidth="3.5" />
        <circle
          className={cn("transition-[stroke-dashoffset] duration-500", tone === "complete" ? "text-success" : "text-primary")}
          cx="18"
          cy="18"
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap="round"
          strokeWidth="3.5"
        />
      </svg>
      {children}
    </span>
  );
}

export function CampaignDailyProgressChip({
  attemptsToday,
  qualified,
  targetCount,
}: CampaignDailyProgressChipProps) {
  const progress = qualified ? 1 : targetCount > 0 ? attemptsToday / targetCount : 0;
  const attemptsLabel = `${Math.min(attemptsToday, targetCount)}/${targetCount}`;

  return (
    <div
      aria-label={qualified ? "Practice reward earned today" : `${attemptsLabel} practice attempts today`}
      className="inline-flex min-h-10 max-w-28 items-center gap-2 rounded-full border border-border-soft bg-card py-1 pe-3 ps-1.5 shadow-sm"
    >
      <ProgressRing progress={progress} tone={qualified ? "complete" : "active"}>
        {qualified ? (
          <CheckCircle aria-hidden="true" className="size-4 text-success" weight="fill" />
        ) : (
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
        )}
      </ProgressRing>
      <Type as="div" className="min-w-0 truncate text-sm font-semibold leading-none tabular-nums" variant="caption">
        {qualified ? "Done" : attemptsLabel}
      </Type>
    </div>
  );
}

export function CampaignPracticeCallout({
  amountLabel = "$0.40",
  retroDaysLabel = "5 days",
  state,
}: CampaignPracticeCalloutProps) {
  const content = {
    "verify-to-earn": {
      icon: <ShieldCheck aria-hidden="true" className="size-5 text-primary" weight="fill" />,
      title: "Verify your region to earn",
      body: "This song has rewards. Your practice day is saved for the campaign window.",
    },
    "pending-credit": {
      icon: <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />,
      title: "Reward pending",
      body: "Today qualified. Credit appears after confirmation.",
    },
    credited: {
      icon: <CheckCircle aria-hidden="true" className="size-5 text-primary" weight="fill" />,
      title: `${amountLabel} earned`,
      body: "Your streak advanced and the reward was added.",
    },
    "cap-reached": {
      icon: <WarningCircle aria-hidden="true" className="size-5 text-amber-600" weight="fill" />,
      title: "Daily cap reached",
      body: "Your streak still counts. More rewards can unlock tomorrow.",
    },
    exhausted: {
      icon: <Clock aria-hidden="true" className="size-5 text-muted-foreground" weight="bold" />,
      title: "Campaign budget used",
      body: `Your streak counts. ${retroDaysLabel} may not pay if the campaign is exhausted.`,
    },
  } satisfies Record<CampaignPracticeState, { body: string; icon: React.ReactNode; title: string }>;

  const selected = content[state];

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-soft bg-card p-4 shadow-sm">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">{selected.icon}</div>
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

function ProviderRow({ label, body, icon }: { body: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      className="flex min-h-20 w-full items-center gap-3 rounded-lg border border-border-soft px-4 py-3 text-start transition-colors hover:bg-muted/35"
      type="button"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">{icon}</div>
      <div className="min-w-0">
        <Type as="div" variant="body-strong">
          {label}
        </Type>
        <Type as="div" className="text-muted-foreground" variant="caption">
          {body}
        </Type>
      </div>
    </button>
  );
}

export function CampaignVerificationSheet({
  forceMobile,
  onOpenChange,
  open,
  state,
}: CampaignVerificationSheetProps) {
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
          <ModalTitle>Verify your region</ModalTitle>
          <ModalDescription className="text-muted-foreground">
            Your passport proof sets your reward rate. Pirate does not see your document.
          </ModalDescription>
        </ModalHeader>

        {state === "providers" ? (
          <div className="mt-5 space-y-3">
            <ProviderRow
              body="Passport proof with nationality for reward tiering."
              icon={<QrCode aria-hidden="true" className="size-5" weight="bold" />}
              label="Self"
            />
            <ProviderRow
              body="Passport proof with nationality for reward tiering."
              icon={<ShieldCheck aria-hidden="true" className="size-5" weight="bold" />}
              label="ZKPassport"
            />
          </div>
        ) : null}

        {state === "missing-nationality" ? (
          <CampaignPracticeCallout state="verify-to-earn" />
        ) : null}

        {state === "pending" ? (
          <CampaignPracticeCallout amountLabel="$0.70" state="pending-credit" />
        ) : null}

        {state === "retro-credit" ? (
          <CampaignPracticeCallout amountLabel="$1.20" retroDaysLabel="5 days" state="credited" />
        ) : null}

        {state === "conflict" ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-border-soft p-4">
            <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-600" weight="fill" />
            <div>
              <Type as="div" variant="body-strong">
                Proof already linked
              </Type>
              <Type as="p" className="mt-1 text-muted-foreground" variant="body">
                This passport proof is connected to another Pirate account.
              </Type>
            </div>
          </div>
        ) : null}

        <ModalFooter className="mt-6">
          <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)}>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function MoneyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="min-w-0">
      <Type as="span" className="mb-1.5 block text-muted-foreground" variant="label">
        {label}
      </Type>
      <Input className="tabular-nums" readOnly value={value} />
    </label>
  );
}

export function RewarderCampaignForm({
  adjustedLevels,
  baseDailyValue,
  baseMilestone30Value,
  baseMilestone7Value,
  budgetValue,
  durationValue,
  fundLabel,
  summaryHint,
}: RewarderCampaignFormProps) {
  return (
    <Card className="rounded-lg border-border bg-card p-5 shadow-none sm:p-6">
      <div className="min-w-0">
        <Type as="h2" className="text-2xl font-semibold" variant="h2">
          Boost Song
        </Type>
        <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
          One practice bonus per person each day. Streak bonuses pay once.
        </Type>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <Type as="div" variant="body-strong">
            Default payouts
          </Type>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <MoneyField label="Per practice day" value={baseDailyValue} />
            <MoneyField label="7-day streak" value={baseMilestone7Value} />
            <MoneyField label="30-day streak" value={baseMilestone30Value} />
          </div>
        </div>

        {adjustedLevels.length > 0 ? (
          <div>
            <Type as="div" variant="body-strong">
              Regional payouts
            </Type>
            <div className="mt-3 space-y-2">
              {adjustedLevels.map((level) => (
                <div className="flex items-start justify-between gap-3" key={level.countriesHint}>
                  <div className="min-w-0">
                    <Type as="div" className="truncate" title={level.countriesTitle} variant="caption">
                      {level.countriesHint}:
                    </Type>
                  </div>
                  <Type as="div" className="shrink-0 text-end tabular-nums" variant="caption">
                    {level.dailyLabel} · {level.milestone7Label} · {level.milestone30Label}
                  </Type>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyField label="Budget (USDC)" value={budgetValue} />
          <MoneyField label="Duration" value={durationValue} />
        </div>
        <div className="!mt-2 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
          <Type as="div" className="text-muted-foreground" variant="caption">
            Estimate
          </Type>
          <Type as="div" className="font-semibold tabular-nums" variant="caption">
            {summaryHint}
          </Type>
        </div>
      </div>

      <div className="mt-6">
        <Button className="h-11 w-full">{fundLabel}</Button>
      </div>
    </Card>
  );
}

export function CampaignFundingPanel({
  amountLabel,
  forceMobile,
  onOpenChange,
  open,
  paymentAddressLabel,
  state,
}: CampaignFundingPanelProps) {
  const statusCopy = {
    quote: ["Fund campaign", "Send Base USDC to activate your boost."],
    confirming: ["Waiting for confirmation", "Payment was seen. Confirmation can take a moment."],
    confirmed: ["Funding confirmed", "Campaign can start at the scheduled time."],
    failed: ["Funding issue", "The payment could not be matched to this campaign."],
  } satisfies Record<CampaignFundingState, [string, string]>;

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
          <ModalTitle>{statusCopy[state][0]}</ModalTitle>
          <ModalDescription className="text-muted-foreground">{statusCopy[state][1]}</ModalDescription>
        </ModalHeader>

        <div className="mt-5 rounded-lg border border-border-soft p-4">
          <div className="flex items-center justify-between gap-3">
            <Type as="div" className="text-muted-foreground" variant="body">
              Amount
            </Type>
            <Type as="div" className="font-semibold tabular-nums" variant="body">
              {amountLabel}
            </Type>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
            <QrCode aria-hidden="true" className="size-8 shrink-0" weight="bold" />
            <Type as="div" className="min-w-0 truncate font-mono text-muted-foreground" variant="caption">
              {paymentAddressLabel}
            </Type>
          </div>
        </div>

        {state === "confirming" ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <HourglassMedium aria-hidden="true" className="size-5 animate-pulse text-primary" weight="bold" />
            <Type as="div" variant="body">
              Waiting for Base confirmation
            </Type>
          </div>
        ) : null}

        {state === "confirmed" ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border-soft p-4">
            <CheckCircle aria-hidden="true" className="size-5 text-primary" weight="fill" />
            <Type as="div" variant="body">
              Budget is locked for this campaign.
            </Type>
          </div>
        ) : null}

        <ModalFooter className="mt-6">
          <Button className="h-12 w-full" onClick={() => onOpenChange?.(false)}>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function RewarderCampaignDashboard({
  creditedLabel,
  remainingLabel,
  statusLabel,
}: RewarderCampaignDashboardProps) {
  return (
    <Card className="rounded-lg border-border bg-card p-5 shadow-none">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Type as="div" className="text-muted-foreground" variant="body">
            Campaign
          </Type>
          <Type as="div" className="mt-1 text-2xl font-semibold" variant="h2">
            {statusLabel}
          </Type>
        </div>
        <StatusPill>Active</StatusPill>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border-soft p-4">
          <Type as="div" className="text-muted-foreground" variant="caption">
            Credited
          </Type>
          <Type as="div" className="mt-1 text-3xl font-semibold tabular-nums" variant="h2">
            {creditedLabel}
          </Type>
        </div>
        <div className="rounded-lg border border-border-soft p-4">
          <Type as="div" className="text-muted-foreground" variant="caption">
            Remaining
          </Type>
          <Type as="div" className="mt-1 text-3xl font-semibold tabular-nums" variant="h2">
            {remainingLabel}
          </Type>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button className="h-11 flex-1" variant="outline">
          Pause
        </Button>
        <Button className="h-11 flex-1" variant="outline">
          Reclaim unused budget
        </Button>
      </div>
    </Card>
  );
}
