"use client";

import * as React from "react";
import {
  BookOpen,
  HourglassMedium,
  MicrophoneStage,
  ShieldWarning,
  Ticket,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export type BountyObjective = "study" | "karaoke";

export type SongBountyLifecycleStatus =
  | "empty"
  | "active"
  | "exhausted"
  | "funding_confirming"
  | "operational_hold";

export interface SongBountyCapabilities {
  canCreate: boolean;
  canFund: boolean;
  reason?: string;
}

export interface SongBountySlot {
  objective: BountyObjective;
  status: SongBountyLifecycleStatus;
  rewardLabel?: string;
  remainingLabel?: string;
  viewerStatusLabel?: string;
}

export interface LegacyEitherBounty {
  rewardLabel: string;
  status: Exclude<SongBountyLifecycleStatus, "empty">;
  remainingLabel?: string;
}

export type SongTicketPoolStatus =
  | "entry_open"
  | "cutoff_frozen"
  | "purchase_pending"
  | "drawing_pending"
  | "exhausted"
  | "operational_hold";

export interface SongTicketPool {
  beneficiaryCountLabel?: string;
  cutoffLabel?: string;
  drawingLabel: string;
  fundingLabel?: string;
  status: SongTicketPoolStatus;
  ticketCountLabel: string;
  viewerEntered?: boolean;
}

export interface SongBountiesSheetProps {
  capabilities: SongBountyCapabilities;
  forceMobile?: boolean;
  legacyEither?: LegacyEitherBounty;
  onOpenChange?: (open: boolean) => void;
  onSlotAction?: (objective: BountyObjective | "either", action: "create" | "fund" | "view") => void;
  onTicketPoolAction?: (action: "create" | "fund" | "view") => void;
  open: boolean;
  slots: readonly SongBountySlot[];
  ticketPool?: SongTicketPool;
}

const OBJECTIVE_COPY = {
  study: {
    description: "Complete today's study set",
    icon: BookOpen,
    title: "Study",
  },
  karaoke: {
    description: "Complete a qualifying karaoke pass",
    icon: MicrophoneStage,
    title: "Karaoke",
  },
} satisfies Record<BountyObjective, {
  description: string;
  icon: React.ComponentType<{ "aria-hidden"?: boolean; className?: string; weight?: "duotone" }>;
  title: string;
}>;

function assertNever(value: never): never {
  throw new Error(`Unhandled bounty state: ${String(value)}`);
}

function lifecycleStatusCopy(slot: SongBountySlot): string {
  switch (slot.status) {
    case "empty":
      return "No bounty yet.";
    case "active":
      return slot.remainingLabel ?? "Open for claims.";
    case "exhausted":
      return "Out of funds. Add funding to reopen this slot.";
    case "funding_confirming":
      return "Funding is confirming. This slot stays reserved.";
    case "operational_hold":
      return "Temporarily unavailable. This slot remains occupied.";
    default:
      return assertNever(slot.status);
  }
}

function slotAction(slot: SongBountySlot, capabilities: SongBountyCapabilities): {
  action: "create" | "fund" | "view";
  disabled: boolean;
  label: string;
} {
  if (slot.status === "empty") {
    return { action: "create", disabled: !capabilities.canCreate, label: capabilities.canCreate ? "Create" : "Unavailable" };
  }
  if (slot.status === "active" || slot.status === "exhausted") {
    return { action: "fund", disabled: !capabilities.canFund, label: capabilities.canFund ? "Fund" : "Unavailable" };
  }
  if (slot.status === "funding_confirming") {
    return { action: "view", disabled: true, label: "Confirming" };
  }
  switch (slot.status) {
    case "operational_hold":
      return { action: "view", disabled: true, label: "On hold" };
    default:
      return assertNever(slot.status);
  }
}

function SlotStateIcon({ slot }: { slot: SongBountySlot }) {
  if (slot.status === "funding_confirming") {
    return <HourglassMedium aria-hidden className="size-5 text-primary" weight="duotone" />;
  }
  if (slot.status === "operational_hold") {
    return <ShieldWarning aria-hidden className="size-5 text-warning" weight="duotone" />;
  }
  if (slot.status === "exhausted") {
    return <WarningCircle aria-hidden className="size-5 text-warning" weight="duotone" />;
  }
  return null;
}

function BountySlotCard({
  capabilities,
  onAction,
  slot,
}: {
  capabilities: SongBountyCapabilities;
  onAction?: SongBountiesSheetProps["onSlotAction"];
  slot: SongBountySlot;
}) {
  const copy = OBJECTIVE_COPY[slot.objective];
  const ObjectiveIcon = copy.icon;
  const action = slotAction(slot, capabilities);
  const unavailable = slot.status === "exhausted" || slot.status === "funding_confirming" || slot.status === "operational_hold";

  return (
    <Card
      aria-label={`${copy.title} bounty slot`}
      className={cn(
        "rounded-xl border-border-soft p-4 shadow-none",
        slot.status === "empty" && "bg-muted/25",
        unavailable && "border-warning/35",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
          <ObjectiveIcon aria-hidden className="size-5" weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Type as="h3" className="min-w-0" variant="h4">{copy.title}</Type>
            <SlotStateIcon slot={slot} />
          </div>
          <Type as="p" className="mt-0.5 text-muted-foreground" variant="caption">
            {copy.description}
          </Type>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {slot.rewardLabel ? (
            <Type as="div" className="break-words" variant="body-strong">
              {slot.rewardLabel}
            </Type>
          ) : null}
          <Type as="p" className="mt-0.5 text-muted-foreground" variant="caption">
            {lifecycleStatusCopy(slot)}
          </Type>
          {slot.viewerStatusLabel ? (
            <Type as="p" className="mt-1 text-success" variant="caption">
              {slot.viewerStatusLabel}
            </Type>
          ) : null}
        </div>
        <Button
          className="h-10 shrink-0"
          disabled={action.disabled}
          onClick={() => onAction?.(slot.objective, action.action)}
          variant={slot.status === "empty" ? "default" : "outline"}
        >
          {action.label}
        </Button>
      </div>
    </Card>
  );
}

function LegacyEitherCard({
  bounty,
  capabilities,
  onAction,
}: {
  bounty: LegacyEitherBounty;
  capabilities: SongBountyCapabilities;
  onAction?: SongBountiesSheetProps["onSlotAction"];
}) {
  const syntheticSlot: SongBountySlot = {
    objective: "study",
    remainingLabel: bounty.remainingLabel,
    rewardLabel: bounty.rewardLabel,
    status: bounty.status,
  };
  const action = slotAction(syntheticSlot, capabilities);
  const lifecycleCopy = bounty.status === "exhausted"
    ? "Out of funds. Add funding to reopen these slots."
    : lifecycleStatusCopy(syntheticSlot);
  return (
    <Card aria-label="Study or Karaoke legacy bounty" className="rounded-xl border-primary/30 bg-primary-subtle p-4 shadow-none">
      <Type as="div" variant="h4">Study or Karaoke</Type>
      <Type as="div" className="mt-2 break-words" variant="body-strong">{bounty.rewardLabel}</Type>
      <Type as="p" className="mt-1 text-muted-foreground" variant="caption">{lifecycleCopy}</Type>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary/20 pt-4">
        <div>
          <Type as="div" variant="label">Study slot</Type>
          <Type as="div" className="text-muted-foreground" variant="caption">Occupied</Type>
        </div>
        <div>
          <Type as="div" variant="label">Karaoke slot</Type>
          <Type as="div" className="text-muted-foreground" variant="caption">Occupied</Type>
        </div>
      </div>
      <Button
        className="mt-4 h-10 w-full"
        disabled={action.disabled}
        onClick={() => onAction?.("either", action.action)}
        variant="outline"
      >
        {action.label}
      </Button>
    </Card>
  );
}

function ticketPoolStatusCopy(pool: SongTicketPool): string {
  switch (pool.status) {
    case "entry_open":
      return pool.viewerEntered
        ? "You're included once in today's beneficiary set."
        : "Sing today to share any winnings from this pool.";
    case "cutoff_frozen":
      return "Today's beneficiary set is frozen and committed.";
    case "purchase_pending":
      return "The custody account is purchasing today's pool tickets.";
    case "drawing_pending":
      return "Tickets are confirmed. The drawing has not settled yet.";
    case "exhausted":
      return "No funded tickets remain. Add funding for a future drawing.";
    case "operational_hold":
      return "This pool is under review. No allocation will be guessed or repeated.";
    default:
      return assertNever(pool.status);
  }
}

function TicketPoolCard({
  capabilities,
  onAction,
  pool,
}: {
  capabilities: SongBountyCapabilities;
  onAction?: SongBountiesSheetProps["onTicketPoolAction"];
  pool?: SongTicketPool;
}) {
  const canFund = capabilities.canFund;
  const needsAttention = pool?.status === "exhausted" || pool?.status === "operational_hold";
  return (
    <Card
      aria-label="Daily Megapot ticket pool"
      className={cn(
        "rounded-xl border-primary/30 bg-primary-subtle p-4 shadow-none",
        needsAttention && "border-warning/35",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-foreground">
          <Ticket aria-hidden className="size-5" weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <Type as="h3" variant="h4">Daily Megapot pool</Type>
          <Type as="p" className="mt-0.5 text-muted-foreground" variant="caption">
            A parallel bonus. Every verified singer today shares any USDC winnings from the pool's tickets.
          </Type>
        </div>
      </div>

      {pool ? (
        <div className="mt-4 space-y-1">
          <Type as="div" className="break-words" variant="body-strong">{pool.ticketCountLabel}</Type>
          <Type as="div" variant="caption">{pool.drawingLabel}</Type>
          {pool.beneficiaryCountLabel ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <UsersThree aria-hidden className="size-4" weight="duotone" />
              <Type as="span" variant="caption">{pool.beneficiaryCountLabel}</Type>
            </div>
          ) : null}
          <Type as="p" className={cn("text-muted-foreground", needsAttention && "text-warning")} variant="caption">
            {ticketPoolStatusCopy(pool)}
          </Type>
          {pool.cutoffLabel ? <Type as="p" className="text-muted-foreground" variant="caption">{pool.cutoffLabel}</Type> : null}
          {pool.fundingLabel ? <Type as="p" className="text-muted-foreground" variant="caption">{pool.fundingLabel}</Type> : null}
        </div>
      ) : (
        <Type as="p" className="mt-4 text-muted-foreground" variant="caption">
          No daily ticket pool is funded for this song yet.
        </Type>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {pool ? (
          <Button className="h-10 w-full" onClick={() => onAction?.("view")} variant="outline">
            View pool
          </Button>
        ) : null}
        <Button
          className={cn("h-10 w-full", !pool && "sm:col-span-2")}
          disabled={pool ? !canFund || pool.status === "purchase_pending" || pool.status === "operational_hold" : !capabilities.canCreate}
          onClick={() => onAction?.(pool ? "fund" : "create")}
        >
          {pool?.status === "purchase_pending"
            ? "Purchase pending"
            : pool?.status === "operational_hold"
              ? "On hold"
              : pool
                ? canFund ? "Fund pool" : "Unavailable"
                : capabilities.canCreate ? "Create ticket pool" : "Unavailable"}
        </Button>
      </div>
    </Card>
  );
}

export function SongBountiesSheet({
  capabilities,
  forceMobile,
  legacyEither,
  onOpenChange,
  onSlotAction,
  onTicketPoolAction,
  open,
  slots,
  ticketPool,
}: SongBountiesSheetProps) {
  const normalizedSlots = (["study", "karaoke"] as const).map((objective) =>
    slots.find((slot) => slot.objective === objective) ?? { objective, status: "empty" as const });

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
          <ModalTitle>Bounties</ModalTitle>
          <ModalDescription className="sr-only">
            Review the daily ticket pool and Study and Karaoke bounty slots for this song.
          </ModalDescription>
        </ModalHeader>

        {capabilities.reason && (!capabilities.canCreate || !capabilities.canFund) ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-border-soft bg-muted/30 p-4">
            <ShieldWarning aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" weight="duotone" />
            <Type as="p" className="text-muted-foreground" variant="body">{capabilities.reason}</Type>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <TicketPoolCard capabilities={capabilities} onAction={onTicketPoolAction} pool={ticketPool} />
          {legacyEither ? (
            <LegacyEitherCard bounty={legacyEither} capabilities={capabilities} onAction={onSlotAction} />
          ) : normalizedSlots.map((slot) => (
            <BountySlotCard
              capabilities={capabilities}
              key={slot.objective}
              onAction={onSlotAction}
              slot={slot}
            />
          ))}
        </div>
      </ModalContent>
    </Modal>
  );
}
