"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { CopyField } from "@/components/primitives/copy-field";
import { Input, inputVariants } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

export interface BoostAmountInputAdornment {
  label: string;
  placement: "prefix" | "suffix";
}

export function CampaignSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-soft py-3 last:border-b-0">
      <Type as="div" className="text-muted-foreground" variant="body">
        {label}
      </Type>
      <Type as="div" className="tabular-nums" variant="body-strong">
        {value}
      </Type>
    </div>
  );
}

export function FundingTransaction({
  explorerTxUrl,
  transactionHash,
}: {
  explorerTxUrl?: string;
  transactionHash: string;
}) {
  return (
    <section className="mt-4 rounded-lg border border-border-soft p-4" aria-label="Funding transaction">
      <Type as="div" className="mb-2 text-muted-foreground" variant="label">
        Transaction
      </Type>
      <CopyField
        className="h-auto min-h-16 items-start py-3"
        copyLabel="transaction hash"
        value={transactionHash}
        wrap
      />
      {explorerTxUrl ? (
        <Button asChild className="mt-3 h-10 w-full" variant="outline">
          <a href={explorerTxUrl} rel="noreferrer" target="_blank">
            View on BaseScan
            <ArrowSquareOut aria-hidden="true" className="size-4" weight="bold" />
          </a>
        </Button>
      ) : null}
    </section>
  );
}

export function BoostAmountInput({
  adornment,
  describedBy,
  id,
  invalid,
  onChange,
  value,
}: {
  adornment: BoostAmountInputAdornment;
  describedBy?: string;
  id: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
  value: string;
}) {
  return (
    <div
      className={cn(
        inputVariants({ size: "default" }),
        "h-auto min-h-11 flex-wrap items-center py-0 focus-within:border-border focus-within:ring-1 focus-within:ring-border-soft",
      )}
    >
      {adornment.placement === "prefix" ? (
        <Type as="span" className="pointer-events-none shrink-0 pe-2 text-muted-foreground" variant="body">
          {adornment.label}
        </Type>
      ) : null}
      <Input
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="h-10 min-w-32 flex-1"
        id={id}
        inputMode="decimal"
        onChange={(event) => onChange?.(event.target.value)}
        value={value}
        variant="flat"
      />
      {adornment.placement === "suffix" ? (
        <Type
          as="span"
          className="pointer-events-none min-w-0 max-w-full break-all ps-2 text-end text-muted-foreground"
          variant="body"
        >
          {adornment.label}
        </Type>
      ) : null}
    </div>
  );
}
