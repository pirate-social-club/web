"use client";

import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  HourglassMedium,
  Ticket,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export type TicketPoolPhase =
  | "entry_open"
  | "entered"
  | "closed_no_entries"
  | "cutoff_frozen"
  | "purchase_reserved"
  | "purchase_submitted"
  | "tickets_confirmed"
  | "drawing_pending"
  | "no_win"
  | "winnings_detected"
  | "claim_submitted"
  | "credited"
  | "operational_review";

export type TicketPoolIssue =
  | "price_stale"
  | "price_ceiling"
  | "insufficient_budget"
  | "snapshot_commit_failed"
  | "purchase_failed"
  | "drawing_delayed"
  | "sweep_stale";

export interface RewardTicketPoolLifecycleProps {
  actionLabel?: string;
  amountLabel?: string;
  beneficiaryCountLabel?: string;
  className?: string;
  cutoffLabel?: string;
  drawingLabel: string;
  evidenceUrl?: string;
  issue?: TicketPoolIssue;
  onAction?: () => void;
  phase: TicketPoolPhase;
  priceCeilingLabel?: string;
  shareLabel?: string;
  ticketCountLabel?: string;
  transactionLabel?: string;
}

const PHASE_COPY = {
  entry_open: {
    action: "Sing this song",
    body: "Qualify before the cutoff to share any winnings from this song's tickets.",
    title: "Ticket pool open",
  },
  entered: {
    action: "View pool",
    body: "Your verified entry is included once for this drawing.",
    title: "You're in the ticket pool",
  },
  closed_no_entries: {
    action: null,
    body: "No verified singers qualified before cutoff, so the pool spent no funding for this drawing.",
    title: "No entries this drawing",
  },
  cutoff_frozen: {
    action: "View commitment",
    body: "Entries are closed and the beneficiary set is committed for this drawing.",
    title: "Ticket pool locked",
  },
  purchase_reserved: {
    action: "View pool",
    body: "Funding is reserved while the pool purchase is prepared.",
    title: "Preparing pool tickets",
  },
  purchase_submitted: {
    action: "Check purchase",
    body: "The ticket purchase is on Base and waiting for confirmation.",
    title: "Pool purchase submitted",
  },
  tickets_confirmed: {
    action: "View drawing",
    body: "The pool tickets are held by the custody account for this drawing.",
    title: "Pool tickets confirmed",
  },
  drawing_pending: {
    action: "View drawing",
    body: "The drawing has not settled yet. Every committed singer shares any net winnings.",
    title: "Drawing pending",
  },
  no_win: {
    action: null,
    body: "None of this song's tickets paid a prize in this drawing.",
    title: "No pool winnings",
  },
  winnings_detected: {
    action: "View allocation",
    body: "The custody account detected a win and is preparing the beneficiary credits.",
    title: "Ticket pool won",
  },
  claim_submitted: {
    action: "Check claim",
    body: "The winnings claim is on Base. Credits wait for confirmed proceeds.",
    title: "Pool claim submitted",
  },
  credited: {
    action: "View balance",
    body: "Your exact atomic USDC share was added to your in-app balance.",
    title: "Pool winnings credited",
  },
  operational_review: {
    action: "Check status",
    body: "The pool outcome is under review. No beneficiary allocation will be guessed or repeated.",
    title: "Ticket pool needs review",
  },
} satisfies Record<TicketPoolPhase, { action: string | null; body: string; title: string }>;

const ISSUE_COPY = {
  drawing_delayed: "The drawing has not resolved on schedule. Tickets and the committed beneficiary set remain unchanged.",
  insufficient_budget: "The pool cannot reserve enough funding for the configured ticket count.",
  price_ceiling: "The live ticket price is above the funder's accepted limit. No purchase was submitted.",
  price_stale: "The live ticket price is unavailable or stale. No purchase was submitted.",
  purchase_failed: "The purchase was proven unsuccessful and its reservation returned to pool availability.",
  snapshot_commit_failed: "The beneficiary commitment was not published before the deadline. This drawing will not spend pool funding.",
  sweep_stale: "Drawing results have not been reconciled on schedule. Winnings status is under review.",
} satisfies Record<TicketPoolIssue, string>;

function StateIcon({ phase }: { phase: TicketPoolPhase }) {
  if (phase === "credited") return <CheckCircle aria-hidden className="size-6 text-success" weight="fill" />;
  if (phase === "entry_open" || phase === "entered") return <UsersThree aria-hidden className="size-6 text-primary" weight="duotone" />;
  if (["purchase_reserved", "purchase_submitted", "claim_submitted"].includes(phase)) {
    return <HourglassMedium aria-hidden className="size-6 text-primary" weight="duotone" />;
  }
  if (["closed_no_entries", "cutoff_frozen", "drawing_pending", "tickets_confirmed"].includes(phase)) {
    return <Clock aria-hidden className="size-6 text-primary" weight="duotone" />;
  }
  if (phase === "operational_review") return <WarningCircle aria-hidden className="size-6 text-warning" weight="fill" />;
  return <Ticket aria-hidden className="size-6" weight="duotone" />;
}

export function RewardTicketPoolLifecycle({
  actionLabel,
  amountLabel,
  beneficiaryCountLabel,
  className,
  cutoffLabel,
  drawingLabel,
  evidenceUrl,
  issue,
  onAction,
  phase,
  priceCeilingLabel,
  shareLabel,
  ticketCountLabel,
  transactionLabel,
}: RewardTicketPoolLifecycleProps) {
  const copy = PHASE_COPY[phase];
  const resolvedAction = actionLabel ?? copy.action;
  return (
    <Card className={cn("border-primary/30 bg-primary-subtle p-4 shadow-none", className)}>
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-background">
          <StateIcon phase={phase} />
        </div>
        <div className="min-w-0 flex-1">
          <Type as="div" variant="h3">{copy.title}</Type>
          <Type as="p" className="mt-1 text-muted-foreground" variant="body">{copy.body}</Type>
          <div className="mt-3 grid gap-1">
            <Type as="div" variant="body-strong">{drawingLabel}</Type>
            {ticketCountLabel ? <Type as="div" variant="caption">{ticketCountLabel}</Type> : null}
            {beneficiaryCountLabel ? <Type as="div" variant="caption">{beneficiaryCountLabel}</Type> : null}
            {cutoffLabel ? <Type as="div" className="text-muted-foreground" variant="caption">{cutoffLabel}</Type> : null}
            {amountLabel ? <Type as="div" className="text-success" variant="body-strong">{amountLabel}</Type> : null}
            {shareLabel ? <Type as="div" className="text-muted-foreground" variant="caption">{shareLabel}</Type> : null}
          </div>
          {issue ? (
            <div className="mt-3 rounded-lg border border-warning/35 bg-background p-3">
              <Type as="p" className="text-warning" variant="caption">{ISSUE_COPY[issue]}</Type>
              {issue === "price_ceiling" && priceCeilingLabel ? (
                <Type as="p" className="mt-1" variant="label">Funding limit · {priceCeilingLabel}</Type>
              ) : null}
            </div>
          ) : null}
          {transactionLabel ? (
            <Type as="p" className="mt-3 break-all text-muted-foreground" variant="caption">
              {transactionLabel}
            </Type>
          ) : null}
          {evidenceUrl ? (
            <Button asChild className="mt-3 h-10 w-full" variant="outline">
              <a href={evidenceUrl} rel="noreferrer" target="_blank">
                View evidence
                <ArrowSquareOut aria-hidden className="size-4" weight="bold" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      {resolvedAction && onAction ? (
        <Button className="mt-4 h-11 w-full" onClick={onAction} variant={phase === "credited" ? "default" : "outline"}>
          {resolvedAction}
        </Button>
      ) : null}
    </Card>
  );
}
