"use client";

import {
  CheckCircle,
  Coins,
  HourglassMedium,
  Ticket,
  WarningCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";

interface FungibleRewardHolding {
  actionDisabled?: boolean;
  actionLabel: string;
  amountLabel: string;
  assetLabel: string;
  id: string;
  kind: "fungible";
  onAction?: () => void;
  state?: "ready" | "pending" | "needs_review";
  supportingLabel?: string;
}

export interface TicketPoolWinningsCredit {
  allocationLabel: string;
  amountLabel?: string;
  drawingLabel: string;
  id: string;
  songLabel: string;
  state: "claim_pending" | "credited" | "needs_review";
}

export type RewardHolding = FungibleRewardHolding;

export interface RewardWalletAssetsProps {
  holdings: readonly RewardHolding[];
  poolCredits?: readonly TicketPoolWinningsCredit[];
  title?: string;
}

function HoldingStateIcon({ holding }: { holding: FungibleRewardHolding }) {
  if (holding.state === "pending") {
    return <HourglassMedium aria-hidden className="size-5 text-primary" weight="duotone" />;
  }
  if (holding.state === "needs_review") {
    return <WarningCircle aria-hidden className="size-5 text-warning" weight="duotone" />;
  }
  return <Coins aria-hidden className="size-5" weight="duotone" />;
}

function FungibleHoldingRow({ holding }: { holding: FungibleRewardHolding }) {
  const pending = holding.state === "pending";
  return (
    <div
      aria-label={`${holding.assetLabel} bounty balance`}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
      role="group"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        <HoldingStateIcon holding={holding} />
      </div>
      <div className="min-w-0 flex-1">
        <Type as="div" className="break-words" variant="body-strong">{holding.amountLabel}</Type>
        <Type as="div" className="break-words text-muted-foreground" variant="caption">
          {holding.supportingLabel ?? holding.assetLabel}
        </Type>
      </div>
      <Button
        className="col-span-2 h-10 w-full sm:col-span-1 sm:w-auto"
        disabled={holding.actionDisabled || pending}
        loading={pending}
        onClick={holding.onAction}
        variant="outline"
      >
        {holding.actionLabel}
      </Button>
    </div>
  );
}

function CreditIcon({ state }: { state: TicketPoolWinningsCredit["state"] }) {
  if (state === "credited") return <CheckCircle aria-hidden className="size-5 text-success" weight="duotone" />;
  if (state === "claim_pending") return <HourglassMedium aria-hidden className="size-5 text-primary" weight="duotone" />;
  return <WarningCircle aria-hidden className="size-5 text-warning" weight="duotone" />;
}

function creditStatusLabel(credit: TicketPoolWinningsCredit): string {
  if (credit.state === "credited") return credit.amountLabel ? `${credit.amountLabel} credited` : "Credit complete";
  if (credit.state === "claim_pending") return credit.amountLabel ? `${credit.amountLabel} awaiting claim` : "Winnings claim pending";
  return "Allocation under review";
}

function TicketPoolCreditRow({ credit }: { credit: TicketPoolWinningsCredit }) {
  return (
    <div
      aria-label={`${credit.songLabel} ${credit.drawingLabel} pool winnings`}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4"
      role="group"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        <CreditIcon state={credit.state} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Ticket aria-hidden className="size-5 shrink-0" weight="duotone" />
          <Type as="div" className="break-words" variant="body-strong">{credit.songLabel}</Type>
        </div>
        <Type as="div" className="break-words text-muted-foreground" variant="caption">
          {credit.drawingLabel} · {creditStatusLabel(credit)}
        </Type>
        <Type as="div" className="break-words text-muted-foreground" variant="caption">
          {credit.allocationLabel}
        </Type>
      </div>
    </div>
  );
}

export function RewardWalletAssets({ holdings, poolCredits = [], title = "Bounties" }: RewardWalletAssetsProps) {
  return (
    <section aria-label="Bounty holdings">
      <div className="mb-3">
        <Type as="h2" variant="h3">{title}</Type>
      </div>
      <Card className="divide-y divide-border-soft overflow-hidden rounded-2xl border-border bg-card shadow-none">
        {holdings.map((holding) => <FungibleHoldingRow holding={holding} key={holding.id} />)}
        {holdings.length === 0 ? (
          <Type as="div" className="px-4 py-8 text-center text-muted-foreground" variant="body">
            Earned bounties will appear here.
          </Type>
        ) : null}
      </Card>
      {poolCredits.length > 0 ? (
        <div className="mt-6">
          <Type as="h3" className="mb-3" variant="h4">Recent ticket-pool winnings</Type>
          <Card className="divide-y divide-border-soft overflow-hidden rounded-2xl border-border bg-card shadow-none">
            {poolCredits.map((credit) => <TicketPoolCreditRow credit={credit} key={credit.id} />)}
          </Card>
        </div>
      ) : null}
    </section>
  );
}
