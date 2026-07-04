"use client";

import * as React from "react";
import { Plus, Trash, Wallet } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import type { AssetRoyaltySplitState } from "./post-composer.types";

export type { AssetRoyaltySplitState } from "./post-composer.types";

export function RoyaltySplitEditor({
  onChange,
  value,
}: {
  onChange: (value: AssetRoyaltySplitState) => void;
  value: AssetRoyaltySplitState;
}) {
  // Raw per-row percent input while editing, so intermediate values like "9."
  // or "9.7" are preserved instead of being rounded on every keystroke.
  const [percentDrafts, setPercentDrafts] = React.useState<Record<string, string>>({});
  const totalSharePct = value.allocations.reduce((sum, allocation) => sum + allocation.sharePct, 0);
  const creatorSharePct = value.allocations
    .filter((allocation) => allocation.recipientKind === "creator")
    .reduce((sum, allocation) => sum + allocation.sharePct, 0);
  const normalizedWallets = value.allocations
    .map((allocation) => (allocation.walletAddress ?? "").trim().toLowerCase())
    .filter(Boolean);
  const hasDuplicateWallets = new Set(normalizedWallets).size !== normalizedWallets.length;
  const hasZeroShare = value.allocations.some((allocation) => allocation.sharePct <= 0);
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

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-border-soft bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Type as="div" variant="body-strong">Royalty split</Type>
          <Type as="p" variant="body" className="text-muted-foreground">
            Add a share to each wallet. Total must be 100%.
          </Type>
        </div>
        <div className={cn(
          "shrink-0 rounded-full px-3 py-1 font-semibold tabular-nums",
          totalSharePct === 100
            ? "bg-primary-subtle text-primary"
            : "bg-destructive/10 text-destructive",
        )}>
          {totalSharePct}%
        </div>
      </div>

      <div className="space-y-3">
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
                      {allocation.walletAddress?.trim() || "Your primary wallet"}
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
              <div className="grid grid-cols-[1fr_auto] items-center rounded-full border border-input bg-background pe-4 shadow-sm">
                <Input
                  aria-label={isCreator ? "Your royalty percentage" : `Recipient ${index + 1} royalty percentage`}
                  className="h-11 rounded-none border-0 bg-transparent pe-2 text-end shadow-none focus-visible:ring-0"
                  inputMode="decimal"
                  max={100}
                  min={0}
                  step={0.01}
                  onChange={(event) => {
                    const raw = event.target.value;
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
                  type="number"
                  value={percentDrafts[allocation.id] ?? allocation.sharePct}
                />
                <span className="font-semibold text-muted-foreground">%</span>
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
        onClick={() => onChange({
          allocations: [
            ...value.allocations,
            {
              id: `recipient-${value.allocations.length}-${Date.now()}`,
              recipientKind: "collaborator",
              sharePct: 0,
            },
          ],
        })}
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
          Royalty shares must total 100% before publishing.
        </Type>
      ) : (
        <Type as="p" variant="caption" className="text-muted-foreground">
          The split becomes fixed when the asset is registered on Story.
        </Type>
      )}
    </div>
  );
}
