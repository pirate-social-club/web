"use client";

import {
  CheckCircle,
  Clock,
  HourglassMedium,
  Ticket,
  WarningCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export type TicketFulfillmentState =
  | "price_stale"
  | "price_blocked"
  | "reserved"
  | "submitted"
  | "confirmed"
  | "failed"
  | "reservation_expired"
  | "needs_review";

export interface RewardTicketFulfillmentProps {
  className?: string;
  fundingAdjustmentLabel?: string;
  onAction?: () => void;
  priceCeilingLabel?: string;
  state: TicketFulfillmentState;
  ticketLabel?: string;
  transactionLabel?: string;
}

const STATE_COPY = {
  price_stale: {
    action: "Check price",
    body: "The current ticket price is unavailable. No reward was reserved.",
    title: "Ticket price unavailable",
  },
  price_blocked: {
    action: "View bounty",
    body: "The current ticket price is above this bounty's funding limit.",
    title: "Bounty cannot cover a ticket",
  },
  reserved: {
    action: "View bounty",
    body: "Funding is reserved while your ticket purchase is prepared.",
    title: "Buying your ticket…",
  },
  submitted: {
    action: "Check status",
    body: "The purchase is on Base and waiting for confirmation.",
    title: "Ticket purchase submitted",
  },
  confirmed: {
    action: "View ticket",
    body: "The ticket belongs to your connected wallet.",
    title: "Megapot ticket delivered",
  },
  failed: {
    action: "Try again",
    body: "No ticket was delivered. Reserved funding was released back to the bounty.",
    title: "Ticket purchase failed",
  },
  reservation_expired: {
    action: "Try again",
    body: "The purchase did not start before its reservation expired. Funding was released back to the bounty.",
    title: "Ticket reservation expired",
  },
  needs_review: {
    action: "Check status",
    body: "Funding remains reserved while the transaction is checked.",
    title: "Ticket purchase needs review",
  },
} satisfies Record<TicketFulfillmentState, { action: string; body: string; title: string }>;

function StateIcon({ state }: { state: TicketFulfillmentState }) {
  if (state === "confirmed") return <CheckCircle aria-hidden className="size-6 text-success" weight="fill" />;
  if (state === "reserved" || state === "submitted") return <HourglassMedium aria-hidden className="size-6 text-primary" weight="duotone" />;
  if (state === "price_stale") return <Clock aria-hidden className="size-6 text-warning" weight="duotone" />;
  if (state === "reservation_expired") return <Clock aria-hidden className="size-6 text-warning" weight="duotone" />;
  if (state === "price_blocked" || state === "needs_review") return <WarningCircle aria-hidden className="size-6 text-warning" weight="fill" />;
  return <WarningCircle aria-hidden className="size-6 text-destructive" weight="fill" />;
}

export function RewardTicketFulfillment({
  className,
  fundingAdjustmentLabel,
  onAction,
  priceCeilingLabel,
  state,
  ticketLabel,
  transactionLabel,
}: RewardTicketFulfillmentProps) {
  const copy = STATE_COPY[state];
  return (
    <Card className={cn("border-primary/30 bg-primary-subtle p-4 shadow-none", className)}>
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-background">
          <StateIcon state={state} />
        </div>
        <div className="min-w-0 flex-1">
          <Type as="div" variant="h3">{copy.title}</Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="body">{copy.body}</Type>
          {priceCeilingLabel && state === "price_blocked" ? (
            <Type as="p" className="mt-2" variant="label">Funding limit · {priceCeilingLabel}</Type>
          ) : null}
          {ticketLabel && state === "confirmed" ? (
            <div className="mt-3 flex items-center gap-2">
              <Ticket aria-hidden className="size-5" weight="duotone" />
              <Type as="span" variant="body-strong">{ticketLabel}</Type>
            </div>
          ) : null}
          {fundingAdjustmentLabel && state === "confirmed" ? (
            <Type as="p" className="mt-2 text-muted-foreground" variant="caption">
              {fundingAdjustmentLabel}
            </Type>
          ) : null}
          {transactionLabel && ["submitted", "needs_review"].includes(state) ? (
            <Type as="p" className="mt-2 break-all text-muted-foreground" variant="caption">
              {transactionLabel}
            </Type>
          ) : null}
        </div>
      </div>
      {onAction ? (
        <Button className="mt-4 h-11 w-full" onClick={onAction} variant={state === "confirmed" ? "default" : "outline"}>
          {copy.action}
        </Button>
      ) : null}
    </Card>
  );
}
