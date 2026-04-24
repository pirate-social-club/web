"use client";

import * as React from "react";

import { FormNote } from "@/components/primitives/form-layout";
import { NumericStepper } from "./create-community-composer.sections";
import { OptionCard } from "@/components/primitives/option-card";
import { Spinner } from "@/components/primitives/spinner";
import type { CourtyardWalletInventoryGroup } from "@/lib/courtyard-inventory-gates";
import { Type } from "@/components/primitives/type";

export type CourtyardWalletGateBuilderProps = {
  groups: CourtyardWalletInventoryGroup[] | null;
  loading: boolean;
  selectedGroup: CourtyardWalletInventoryGroup | null;
  quantity: number;
  onSelectGroup: (group: CourtyardWalletInventoryGroup) => void;
  onQuantityChange: (quantity: number) => void;
  emptyMessage?: string;
  quantityLabel?: string;
};

function groupKey(group: CourtyardWalletInventoryGroup): string {
  return [
    group.category,
    group.franchise ?? "",
    group.subject ?? "",
    group.brand ?? "",
    group.model ?? "",
    group.reference ?? "",
    group.set ?? "",
    group.year ?? "",
    group.grader ?? "",
    group.grade ?? "",
    group.condition ?? "",
  ].join(":");
}

export function CourtyardWalletGateBuilder({
  groups,
  loading,
  selectedGroup,
  quantity,
  onSelectGroup,
  onQuantityChange,
  emptyMessage = "No Courtyard collectibles found in connected wallet.",
  quantityLabel = "Quantity required",
}: CourtyardWalletGateBuilderProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8">
        <Spinner className="size-5 text-muted-foreground" />
        <span className="text-base text-muted-foreground">Loading your inventory...</span>
      </div>
    );
  }

  if (groups === null || groups.length === 0) {
    return <FormNote tone="warning">{emptyMessage}</FormNote>;
  }

  const selectedKey = selectedGroup ? groupKey(selectedGroup) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {groups.map((group) => (
          <OptionCard
            key={groupKey(group)}
            description={group.displayDetail ?? `${group.count} in wallet`}
            selected={selectedKey === groupKey(group)}
            title={group.displayLabel}
            onClick={() => onSelectGroup(group)}
          />
        ))}
      </div>

      {selectedGroup && (
        <div className="space-y-2 border-t border-border-soft pt-4">
          <Type as="p" variant="label" className="">{quantityLabel}</Type>
          <NumericStepper
            max={Math.min(100, selectedGroup.count)}
            min={1}
            value={quantity}
            onChange={onQuantityChange}
          />
        </div>
      )}
    </div>
  );
}
