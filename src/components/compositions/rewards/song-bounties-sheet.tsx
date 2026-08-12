"use client";

import * as React from "react";
import {
  BookOpen,
  HourglassMedium,
  MicrophoneStage,
  ShieldWarning,
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

type BountyObjective = "study" | "karaoke";

type SongBountyLifecycleStatus =
  | "empty"
  | "active"
  | "exhausted"
  | "funding_confirming"
  | "operational_hold";

type SongBountyClaimsPausedReason = "price_stale" | "price_ceiling";

interface SongBountyCapabilities {
  canCreate: boolean;
  canFund: boolean;
  reason?: string;
}

interface SongBountySlot {
  claimsPausedReason?: SongBountyClaimsPausedReason;
  objective: BountyObjective;
  status: SongBountyLifecycleStatus;
  rewardLabel?: string;
  remainingLabel?: string;
  priceCeilingLabel?: string;
  viewerStatusLabel?: string;
}

interface LegacyEitherBounty {
  claimsPausedReason?: SongBountyClaimsPausedReason;
  rewardLabel: string;
  status: Exclude<SongBountyLifecycleStatus, "empty">;
  remainingLabel?: string;
  priceCeilingLabel?: string;
}

export interface SongBountiesSheetProps {
  capabilities: SongBountyCapabilities;
  forceMobile?: boolean;
  legacyEither?: LegacyEitherBounty;
  onOpenChange?: (open: boolean) => void;
  onSlotAction?: (objective: BountyObjective | "either", action: "create" | "fund" | "view") => void;
  open: boolean;
  slots: readonly SongBountySlot[];
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

function claimsPausedCopy(slot: SongBountySlot): string | null {
  switch (slot.claimsPausedReason) {
    case undefined:
      return null;
    case "price_stale":
      return "Ticket price unavailable. New claims are paused.";
    case "price_ceiling":
      return `The ticket price is above this bounty's ${slot.priceCeilingLabel ?? "funding limit"}. New claims are paused.`;
    default:
      return assertNever(slot.claimsPausedReason);
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
  if (slot.status === "exhausted" || slot.claimsPausedReason) {
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
  const pauseCopy = claimsPausedCopy(slot);
  const unavailable = slot.status === "exhausted" || slot.status === "funding_confirming" || slot.status === "operational_hold" || Boolean(slot.claimsPausedReason);

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
          {pauseCopy ? (
            <Type as="p" className="mt-1 text-warning" variant="caption">
              {pauseCopy}
            </Type>
          ) : null}
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
    claimsPausedReason: bounty.claimsPausedReason,
    objective: "study",
    priceCeilingLabel: bounty.priceCeilingLabel,
    remainingLabel: bounty.remainingLabel,
    rewardLabel: bounty.rewardLabel,
    status: bounty.status,
  };
  const action = slotAction(syntheticSlot, capabilities);
  const pauseCopy = claimsPausedCopy(syntheticSlot);
  const lifecycleCopy = bounty.status === "exhausted"
    ? "Out of funds. Add funding to reopen these slots."
    : lifecycleStatusCopy(syntheticSlot);
  return (
    <Card aria-label="Study or Karaoke legacy bounty" className="rounded-xl border-primary/30 bg-primary-subtle p-4 shadow-none">
      <Type as="div" variant="h4">Study or Karaoke</Type>
      <Type as="div" className="mt-2 break-words" variant="body-strong">{bounty.rewardLabel}</Type>
      <Type as="p" className="mt-1 text-muted-foreground" variant="caption">
        {lifecycleCopy}
      </Type>
      {pauseCopy ? (
        <Type as="p" className="mt-1 text-warning" variant="caption">{pauseCopy}</Type>
      ) : null}
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

export function SongBountiesSheet({
  capabilities,
  forceMobile,
  legacyEither,
  onOpenChange,
  onSlotAction,
  open,
  slots,
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
            Review the Study and Karaoke bounty slots for this song.
          </ModalDescription>
        </ModalHeader>

        {capabilities.reason && (!capabilities.canCreate || !capabilities.canFund) ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-border-soft bg-muted/30 p-4">
            <ShieldWarning aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" weight="duotone" />
            <Type as="p" className="text-muted-foreground" variant="body">
              {capabilities.reason}
            </Type>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
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
