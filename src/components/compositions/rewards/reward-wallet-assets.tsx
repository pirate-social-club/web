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

export interface FungibleRewardHolding {
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

export interface MegapotTicketHolding {
  actionDisabled?: boolean;
  actionLabel?: string;
  drawingLabel: string;
  id: string;
  kind: "megapot_ticket";
  onAction?: () => void;
  state: "delivered" | "winner" | "claiming" | "claimed" | "no_win";
  ticketLabel: string;
  winningsLabel?: string;
}

export type RewardHolding = FungibleRewardHolding | MegapotTicketHolding;

export interface RewardWalletAssetsProps {
  holdings: readonly RewardHolding[];
  title?: string;
}

function HoldingStateIcon({ holding }: { holding: RewardHolding }) {
  if (holding.kind === "fungible") {
    if (holding.state === "pending") {
      return <HourglassMedium aria-hidden className="size-5 text-primary" weight="duotone" />;
    }
    if (holding.state === "needs_review") {
      return <WarningCircle aria-hidden className="size-5 text-warning" weight="duotone" />;
    }
    return <Coins aria-hidden className="size-5" weight="duotone" />;
  }
  if (holding.state === "claiming") {
    return <HourglassMedium aria-hidden className="size-5 text-primary" weight="duotone" />;
  }
  if (holding.state === "claimed") {
    return <CheckCircle aria-hidden className="size-5 text-success" weight="duotone" />;
  }
  return <Ticket aria-hidden className="size-5" weight="duotone" />;
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

function ticketSupportingLabel(holding: MegapotTicketHolding): string {
  if (holding.state === "winner") {
    return holding.winningsLabel
      ? `${holding.drawingLabel} · Won ${holding.winningsLabel}`
      : `${holding.drawingLabel} · Winning amount pending`;
  }
  if (holding.state === "claiming") return `${holding.drawingLabel} · Claim submitted`;
  if (holding.state === "claimed") return `${holding.drawingLabel} · Winnings claimed`;
  if (holding.state === "no_win") return `${holding.drawingLabel} · Drawing closed · No winnings`;
  return `${holding.drawingLabel} · Delivered`;
}

function ticketActionLabel(holding: MegapotTicketHolding): string | null {
  if (holding.actionLabel) return holding.actionLabel;
  if (holding.state === "winner") return "Claim winnings";
  if (holding.state === "claiming") return "Claiming";
  if (holding.state === "claimed") return "Claimed";
  if (holding.state === "no_win") return null;
  return "View ticket";
}

function TicketHoldingRow({ holding }: { holding: MegapotTicketHolding }) {
  const actionLabel = ticketActionLabel(holding);
  const disabled = holding.actionDisabled || holding.state === "claiming" || holding.state === "claimed";
  return (
    <div
      aria-label={`${holding.ticketLabel} Megapot reward`}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
      role="group"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        <HoldingStateIcon holding={holding} />
      </div>
      <div className="min-w-0 flex-1">
        <Type as="div" className="break-words" variant="body-strong">{holding.ticketLabel}</Type>
        <Type as="div" className="break-words text-muted-foreground" variant="caption">
          {ticketSupportingLabel(holding)}
        </Type>
      </div>
      {actionLabel ? (
        <Button
          className="col-span-2 h-10 w-full sm:col-span-1 sm:w-auto"
          disabled={disabled}
          loading={holding.state === "claiming"}
          onClick={holding.onAction}
          variant={holding.state === "winner" ? "default" : "outline"}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function RewardWalletAssets({ holdings, title = "Bounties" }: RewardWalletAssetsProps) {
  return (
    <section aria-label="Bounty holdings">
      <div className="mb-3">
        <Type as="h2" variant="h3">{title}</Type>
        <Type as="p" className="mt-1 text-muted-foreground" variant="body">
          Claim each reward from its own asset.
        </Type>
      </div>
      <Card className="divide-y divide-border-soft overflow-hidden rounded-2xl border-border bg-card shadow-none">
        {holdings.map((holding) => holding.kind === "fungible"
          ? <FungibleHoldingRow holding={holding} key={holding.id} />
          : <TicketHoldingRow holding={holding} key={holding.id} />)}
        {holdings.length === 0 ? (
          <Type as="div" className="px-4 py-8 text-center text-muted-foreground" variant="body">
            Earned bounties will appear here.
          </Type>
        ) : null}
      </Card>
    </section>
  );
}
