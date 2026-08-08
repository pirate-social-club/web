"use client";

import * as React from "react";
import { Plus, Trash, Wallet } from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type {
  AssetRoyaltySplitState,
  CharityContributionState,
  CommunityCharityPartner,
} from "./post-composer.types";
import { defaultCharityContributionPct } from "./post-composer-config";

export type { AssetRoyaltySplitState } from "./post-composer.types";

function buildAvatarFallback(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "C";
  return trimmed
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C";
}

function displayPct(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/u, "");
}

const percentInputClassName = "h-11 rounded-none border-0 bg-transparent px-0 text-end tabular-nums shadow-none focus-visible:ring-0";

export function RoyaltySplitEditor({
  charityContribution,
  charityPartner,
  onChange,
  onCharityContributionChange,
  value,
}: {
  charityContribution?: CharityContributionState;
  charityPartner?: CommunityCharityPartner | null;
  onChange: (value: AssetRoyaltySplitState) => void;
  onCharityContributionChange?: (updater: (current: CharityContributionState) => CharityContributionState) => void;
  value: AssetRoyaltySplitState;
}) {
  // Raw per-row percent input while editing, so intermediate values like "9."
  // or "9.7" are preserved instead of being rounded on every keystroke.
  const [percentDrafts, setPercentDrafts] = React.useState<Record<string, string>>({});
  const rawCharityPct = charityContribution?.percentagePct ?? 0;
  const charityPct = charityPartner ? Math.min(50, Math.max(0, rawCharityPct)) : 0;
  const singleCreatorOnly = value.allocations.length === 1 && value.allocations[0]?.recipientKind === "creator";
  const totalWalletSharePct = value.allocations.reduce((sum, allocation) => sum + allocation.sharePct, 0);
  const totalSharePct = charityPct + totalWalletSharePct;
  const creatorSharePct = value.allocations
    .filter((allocation) => allocation.recipientKind === "creator")
    .reduce((sum, allocation) => sum + allocation.sharePct, 0);
  const normalizedWallets = value.allocations
    .map((allocation) => (allocation.walletAddress ?? "").trim().toLowerCase())
    .filter(Boolean);
  const hasDuplicateWallets = new Set(normalizedWallets).size !== normalizedWallets.length;
  const hasZeroShare = value.allocations.some((allocation) => allocation.sharePct <= 0);
  const updateForSoloCreator = React.useCallback((nextCharityPct: number) => {
    if (!singleCreatorOnly) return;
    const creator = value.allocations[0];
    if (!creator) return;
    const nextCreatorSharePct = 100 - nextCharityPct;
    if (creator.sharePct === nextCreatorSharePct) return;
    onChange({
      allocations: [{
        ...creator,
        sharePct: nextCreatorSharePct,
      }],
    });
  }, [onChange, singleCreatorOnly, value.allocations]);
  const updateCharityPct = (nextCharityPct: number) => {
    const clamped = Math.min(50, Math.max(0, nextCharityPct));
    onCharityContributionChange?.((current) => ({
      ...current,
      percentagePct: clamped,
    }));
    updateForSoloCreator(clamped);
  };
  const updateAllocation = (
    allocationId: string,
    patch: Partial<AssetRoyaltySplitState["allocations"][number]>,
  ) => {
    onChange({
      allocations: value.allocations.map((allocation) =>
        allocation.id === allocationId ? { ...allocation, ...patch } : allocation
      ),
    });
  };
  React.useEffect(() => {
    updateForSoloCreator(charityPct);
    // Keep the solo row filled from the charity field. User-driven changes are
    // routed through updateCharityPct, so this only catches external state loads.
  }, [charityPct, updateForSoloCreator]);
  React.useEffect(() => {
    if (!charityPartner || rawCharityPct === charityPct) return;
    onCharityContributionChange?.((current) => ({
      ...current,
      percentagePct: charityPct,
    }));
  }, [charityPartner, charityPct, onCharityContributionChange, rawCharityPct]);

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Type as="div" variant="body-strong">Sale proceeds</Type>
          <Type as="p" variant="body" className="text-muted-foreground">
            Split each sale between charity and payout wallets.
          </Type>
        </div>
        <div className={cn(
          "shrink-0 rounded-full px-3 py-1 font-semibold tabular-nums",
          totalSharePct === 100
            ? "bg-primary-subtle text-primary"
            : "bg-destructive/10 text-destructive",
        )}>
          {displayPct(totalSharePct)}%
        </div>
      </div>

      <div className="space-y-3">
        {charityPartner && charityPct === 0 ? (
          <Button
            className="w-full justify-start"
            leadingIcon={<Plus className="size-4" />}
            onClick={() => updateCharityPct(defaultCharityContributionPct)}
            variant="outline"
          >
            Add charity
          </Button>
        ) : null}
        {charityPartner && charityPct > 0 ? (
          <div className="grid items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background p-3 sm:grid-cols-[1fr_7rem_auto] sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                className="border-border-soft bg-card"
                fallback={buildAvatarFallback(charityPartner.displayName)}
                size="md"
                src={charityPartner.imageUrl?.trim() || undefined}
              />
              <div className="min-w-0">
                <Type as="div" variant="body-strong" className="truncate">
                  {charityPartner.displayName}
                </Type>
                <Type as="div" variant="caption" className="text-muted-foreground">
                  Charity
                </Type>
              </div>
            </div>
            <div className="grid h-11 grid-cols-[minmax(0,1fr)_1.25rem] items-center rounded-full border border-input bg-background px-4 shadow-sm">
              <Input
                aria-label="Charity percentage"
                className={percentInputClassName}
                inputMode="numeric"
                max={50}
                min={0}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9]/gu, "");
                  updateCharityPct(raw === "" ? 0 : Number.parseInt(raw, 10));
                }}
                type="text"
                value={charityPct === 0 ? "" : String(charityPct)}
              />
              <span className="text-end font-semibold text-muted-foreground">%</span>
            </div>
            <Button
              aria-label="Remove charity donation"
              className="h-11 w-11 self-stretch sm:size-11 sm:self-center"
              onClick={() => updateCharityPct(0)}
              size="icon"
              variant="ghost"
            >
              <Trash className="size-5" />
            </Button>
          </div>
        ) : null}
        {value.allocations.map((allocation, index) => {
          const isCreator = allocation.recipientKind === "creator";
          return (
            <div
              className="grid items-center gap-3 rounded-[var(--radius-lg)] border border-border-soft bg-background p-3 sm:grid-cols-[1fr_7rem_auto] sm:p-4"
              key={allocation.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Wallet className="size-5" />
                </span>
                {isCreator ? (
                  // Creator wallet is read-only: it must be your primary wallet,
                  // and registration mints the IP + your share to it.
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Type as="span" variant="body-strong" className="shrink-0 text-foreground">
                      You
                    </Type>
                    <Type
                      as="span"
                      variant="body"
                      className="min-w-0 flex-1 truncate font-mono text-muted-foreground"
                      title={allocation.walletAddress ?? undefined}
                    >
                      {allocation.walletAddress?.trim() || ""}
                    </Type>
                  </div>
                ) : (
                  <Input
                    aria-label={`Recipient ${index + 1} wallet address`}
                    className="h-11 min-w-0 flex-1 font-mono"
                    onChange={(event) => updateAllocation(allocation.id, { walletAddress: event.target.value })}
                    placeholder="0x..."
                    value={allocation.walletAddress ?? ""}
                  />
                )}
              </div>
              <div className="grid h-11 grid-cols-[minmax(0,1fr)_1.25rem] items-center rounded-full border border-input bg-background px-4 shadow-sm">
                <Input
                  aria-label={isCreator ? "Your royalty percentage" : `Recipient ${index + 1} royalty percentage`}
                  className={percentInputClassName}
                  disabled={singleCreatorOnly}
                  inputMode="decimal"
                  max={100}
                  min={0}
                  step={0.01}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^0-9.]/gu, "");
                    setPercentDrafts((prev) => ({ ...prev, [allocation.id]: raw }));
                    const parsed = Number.parseFloat(raw);
                    // Clamp to [0, 100] but do not round here; finer-than-bps
                    // precision is rejected by validation before publishing.
                    if (Number.isFinite(parsed)) {
                      updateAllocation(allocation.id, { sharePct: Math.min(100, Math.max(0, parsed)) });
                    }
                  }}
                  onBlur={() => setPercentDrafts((prev) => {
                    if (!(allocation.id in prev)) return prev;
                    const next = { ...prev };
                    delete next[allocation.id];
                    return next;
                  })}
                  type="text"
                  value={percentDrafts[allocation.id] ?? allocation.sharePct}
                />
                <span className="text-end font-semibold text-muted-foreground">%</span>
              </div>
              {isCreator ? (
                <span className="hidden sm:block sm:size-11" aria-hidden="true" />
              ) : (
                <Button
                  aria-label={`Remove recipient ${index + 1}`}
                  className="h-11 w-11 self-stretch sm:size-11 sm:self-center"
                  onClick={() => onChange({
                    allocations: value.allocations.filter((item) => item.id !== allocation.id),
                  })}
                  size="icon"
                  variant="ghost"
                >
                  <Trash className="size-5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Button
        className="w-full"
        leadingIcon={<Plus className="size-4" />}
        onClick={() => {
          const nextWalletCount = value.allocations.length + 1;
          const walletPoolPct = 100 - charityPct;
          const baseSharePct = Math.floor((walletPoolPct / nextWalletCount) * 100) / 100;
          const allocatedPct = baseSharePct * nextWalletCount;
          const lastSharePct = Math.round((baseSharePct + walletPoolPct - allocatedPct) * 100) / 100;
          onChange({
            allocations: [
              ...value.allocations.map((allocation) => ({
                ...allocation,
                sharePct: baseSharePct,
              })),
              {
                id: `recipient-${value.allocations.length}-${Date.now()}`,
                recipientKind: "collaborator",
                sharePct: lastSharePct,
              },
            ],
          });
        }}
        variant="outline"
      >
        Add wallet
      </Button>

      {creatorSharePct === 0 ? (
        <Type as="p" variant="caption" className="text-destructive">
          You need to receive at least some royalty.
        </Type>
      ) : hasZeroShare ? (
        <Type as="p" variant="caption" className="text-destructive">
          Every recipient needs a share greater than 0%.
        </Type>
      ) : hasDuplicateWallets ? (
        <Type as="p" variant="caption" className="text-destructive">
          Each wallet can appear only once.
        </Type>
      ) : totalSharePct !== 100 ? (
        <Type as="p" variant="caption" className="text-destructive">
          Sale proceeds must total 100% before publishing.
        </Type>
      ) : (
        <Type as="p" variant="caption" className="text-muted-foreground">
          The split becomes fixed when the asset is registered on Story.
        </Type>
      )}
    </div>
  );
}
