"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Copy,
  MagnifyingGlass,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/compositions/system/modal/modal";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { ChainIcon, TokenChainIcon } from "../wallet-hub/wallet-visuals";
import {
  formatShortAddress,
  getSendableAssets,
  parseDisplayNumber,
  validateAmount,
  validateEvmAddress,
} from "./wallet-send-sheet-model";
import type { WalletSendAsset, WalletSendSheetProps, WalletSendStep } from "./wallet-send-sheet.types";

function assetKey(asset: WalletSendAsset): string {
  return `${asset.chainId}:${asset.token.id}`;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-soft py-3 last:border-b-0">
      <Type as="div" className="text-muted-foreground" variant="body">
        {label}
      </Type>
      <Type as="div" className="min-w-0 truncate text-end" variant="body-strong">
        {value}
      </Type>
    </div>
  );
}

function StepBackButton({ onClick }: { onClick: () => void }) {
  const { isRtl } = useUiLocale();

  return (
    <Button aria-label="Back" className="size-10" onClick={onClick} size="icon" variant="ghost">
      {isRtl ? <ArrowRight aria-hidden="true" className="size-5" /> : <ArrowLeft aria-hidden="true" className="size-5" />}
    </Button>
  );
}

function ModalStepTitle({
  asset,
  children,
  onBack,
}: {
  asset?: WalletSendAsset | null;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pe-10">
      {onBack ? <StepBackButton onClick={onBack} /> : null}
      <div className="min-w-0">
        <ModalTitle>{children}</ModalTitle>
        {asset ? (
          <ModalDescription className="mt-1 truncate text-muted-foreground">
            Send {asset.token.symbol} on {asset.chainTitle}
          </ModalDescription>
        ) : null}
      </div>
    </div>
  );
}

function AssetStep({
  assets,
  onSelect,
}: {
  assets: WalletSendAsset[];
  onSelect: (asset: WalletSendAsset) => void;
}) {
  const [query, setQuery] = React.useState("");
  const filteredAssets = assets.filter((asset) => {
    const haystack = `${asset.chainTitle} ${asset.token.symbol} ${asset.token.name}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const grouped = filteredAssets.reduce<Record<string, WalletSendAsset[]>>((groups, asset) => {
    groups[asset.chainTitle] = [...(groups[asset.chainTitle] ?? []), asset];
    return groups;
  }, {});

  return (
    <div className="mt-5 space-y-4">
      <label className="relative block">
        <MagnifyingGlass aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-11"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assets"
          value={query}
        />
      </label>

      <div className="space-y-5">
        {Object.entries(grouped).map(([chainTitle, chainAssets]) => (
          <div key={chainTitle}>
            <Type as="div" className="mb-2 px-1 text-muted-foreground" variant="label">
              {chainTitle}
            </Type>
            <div className="overflow-hidden rounded-lg border border-border-soft">
              {chainAssets.map((asset) => (
                <button
                  className="flex min-h-16 w-full items-center gap-3 border-b border-border-soft px-4 py-3 text-start transition-colors last:border-b-0 hover:bg-muted/35"
                  key={assetKey(asset)}
                  onClick={() => onSelect(asset)}
                  type="button"
                >
                  <TokenChainIcon chainId={asset.chainId} showChainBadge size="sm" token={asset.token} />
                  <div className="min-w-0 flex-1">
                    <Type as="div" variant="body-strong">
                      {asset.token.symbol}
                    </Type>
                    <Type as="div" className="truncate text-muted-foreground" variant="caption">
                      {asset.chainTitle}
                    </Type>
                  </div>
                  <div className="text-end">
                    <Type as="div" className="tabular-nums" variant="body">
                      {asset.token.balance}
                    </Type>
                    <Type as="div" className="tabular-nums text-muted-foreground" variant="caption">
                      {asset.token.fiatValue ?? "$0.00"}
                    </Type>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredAssets.length === 0 ? (
          <Type as="div" className="rounded-lg border border-border-soft p-5 text-center text-muted-foreground" variant="body">
            No sendable assets.
          </Type>
        ) : null}
      </div>
    </div>
  );
}

export function WalletSendSheet({
  amount: controlledAmount,
  chainSections,
  defaultAssetId,
  defaultRecipient = "",
  errorMessage = "Transaction failed. Check the network and try again.",
  feeLabel = "~$0.01",
  forceMobile,
  onConfirm,
  onOpenChange,
  open,
  step: controlledStep,
  txHash = "0x4b6c9f0a8d3e2c1b7a6d5e4f3c2b1a0987654321abcdef1234567890abcdef12",
}: WalletSendSheetProps) {
  const assets = React.useMemo(() => getSendableAssets(chainSections), [chainSections]);
  const defaultAsset = assets.find((asset) => assetKey(asset) === defaultAssetId) ?? assets[0] ?? null;
  const [step, setStep] = React.useState<WalletSendStep>(controlledStep ?? "asset");
  const [asset, setAsset] = React.useState<WalletSendAsset | null>(defaultAsset);
  const [recipient, setRecipient] = React.useState(defaultRecipient);
  const [amount, setAmount] = React.useState(controlledAmount ?? "");

  React.useEffect(() => {
    if (!open) return;
    setStep(controlledStep ?? "asset");
    setAsset(defaultAsset);
    setRecipient(defaultRecipient);
    setAmount(controlledAmount ?? "");
  }, [controlledAmount, controlledStep, defaultAsset, defaultRecipient, open]);

  const recipientError = step === "recipient" && recipient.trim() ? validateEvmAddress(recipient) : null;
  const recipientIsValid = !validateEvmAddress(recipient);
  const amountError = step === "amount" ? validateAmount(amount, asset) : null;
  const reviewReady = asset && !validateEvmAddress(recipient) && !validateAmount(amount, asset);

  function handleSelectAsset(nextAsset: WalletSendAsset) {
    setAsset(nextAsset);
    setStep("recipient");
  }

  function handleConfirm() {
    if (!reviewReady) return;
    onConfirm?.({ amount, asset, recipient });
    if (!onConfirm) setStep("pending");
  }

  function handleCopyRecipient() {
    void navigator.clipboard.writeText(recipient);
  }

  return (
    <Modal forceMobile={forceMobile} onOpenChange={onOpenChange} open={open}>
      <ModalContent
        className={cn(
          "flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-[var(--radius-3xl)] border-x-0 border-b-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4",
          !forceMobile && "md:w-[min(100%-2rem,38rem)] md:max-w-[38rem] md:px-7 md:pb-7 md:pt-7",
        )}
        mobileSide="bottom"
      >
        <div className={cn("mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/60", !forceMobile && "md:hidden")} aria-hidden="true" />
        <ModalHeader className="text-start">
          {step === "asset" ? (
            <>
              <ModalTitle>Send</ModalTitle>
              <ModalDescription className="text-muted-foreground">
                Choose the asset and network first.
              </ModalDescription>
            </>
          ) : null}
          {step === "recipient" ? (
            <ModalStepTitle asset={asset} onBack={() => setStep("asset")}>
              Recipient
            </ModalStepTitle>
          ) : null}
          {step === "amount" ? (
            <ModalStepTitle asset={asset} onBack={() => setStep("recipient")}>
              Amount
            </ModalStepTitle>
          ) : null}
          {step === "review" ? (
            <ModalStepTitle asset={asset} onBack={() => setStep("amount")}>
              Review send
            </ModalStepTitle>
          ) : null}
          {step === "pending" ? <ModalTitle>Submitting transaction</ModalTitle> : null}
          {step === "success" ? <ModalTitle>Send complete</ModalTitle> : null}
          {step === "error" ? <ModalTitle>Send failed</ModalTitle> : null}
        </ModalHeader>

        {step === "asset" ? <AssetStep assets={assets} onSelect={handleSelectAsset} /> : null}

        {step === "recipient" && asset ? (
          <div className="mt-6 space-y-4">
            <Input
              aria-invalid={!!recipientError}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="0x..."
              size="lg"
              value={recipient}
            />
            {recipient && !recipientError ? (
              <Type as="p" className="text-success" variant="body">
                Address format looks valid.
              </Type>
            ) : null}
            {recipientError ? (
              <Type as="p" className="text-warning" variant="body">
                {recipientError}
              </Type>
            ) : null}
            <Button className="h-14 w-full" disabled={!recipientIsValid} onClick={() => setStep("amount")}>
              Continue
            </Button>
          </div>
        ) : null}

        {step === "amount" && asset ? (
          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              <Input
                aria-invalid={!!amountError}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                size="lg"
                value={amount}
              />
              <Button
                className="h-16 shrink-0"
                onClick={() => setAmount(asset.token.balance ?? "0")}
                variant="secondary"
              >
                Max
              </Button>
            </div>
            <div className="space-y-1">
              <Type as="p" className="text-muted-foreground" variant="body">
                Available: {asset.token.balance ?? "0"} {asset.token.symbol}
              </Type>
              <Type as="p" className="text-muted-foreground" variant="body">
                Network fee: {feeLabel} ({asset.chainId === "story" ? "IP" : "ETH"})
              </Type>
              {amount ? (
                <Type as="p" variant="body">
                  You will send: {parseDisplayNumber(amount).toLocaleString("en-US")} {asset.token.symbol}
                </Type>
              ) : null}
            </div>
            {amountError ? (
              <Type as="p" className="text-warning" variant="body">
                {amountError}
              </Type>
            ) : null}
            <Button className="h-14 w-full" disabled={!!amountError} onClick={() => setStep("review")}>
              Review
            </Button>
          </div>
        ) : null}

        {step === "review" && asset ? (
          <div className="mt-6">
            <div className="rounded-lg border border-border-soft px-4">
              <SummaryRow label="Asset" value={asset.token.symbol} />
              <SummaryRow label="Amount" value={`${amount} ${asset.token.symbol}`} />
              <SummaryRow
                label="Network"
                value={
                  <span className="inline-flex min-w-0 items-center justify-end gap-2">
                    <ChainIcon chainId={asset.chainId} className="size-5" framed={false} />
                    <span className="truncate">{asset.chainTitle}</span>
                  </span>
                }
              />
              <SummaryRow
                label="Recipient"
                value={
                  <span className="inline-flex min-w-0 items-center justify-end gap-2">
                    <span className="truncate font-mono">{formatShortAddress(recipient)}</span>
                    <button aria-label="Copy recipient" className="text-muted-foreground hover:text-foreground" onClick={handleCopyRecipient} type="button">
                      <Copy aria-hidden="true" className="size-4" />
                    </button>
                  </span>
                }
              />
              <SummaryRow label="Fee" value={feeLabel} />
              <SummaryRow label="Total debited" value={`${amount || "0"} ${asset.token.symbol} + fee`} />
            </div>
            <ModalFooter className="mt-6 gap-3 sm:justify-end">
              <Button onClick={() => onOpenChange(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleConfirm}>Confirm send</Button>
            </ModalFooter>
          </div>
        ) : null}

        {step === "pending" ? (
          <div className="mt-8 grid justify-items-center gap-4 py-8 text-center">
            <SpinnerGap aria-hidden="true" className="size-10 animate-spin text-muted-foreground" />
            <Type as="p" variant="body-strong">
              Submitting transaction...
            </Type>
          </div>
        ) : null}

        {step === "success" ? (
          <div className="mt-8 grid justify-items-center gap-4 py-6 text-center">
            <CheckCircle aria-hidden="true" className="size-12 text-success" weight="fill" />
            <Type as="p" variant="body-strong">
              Transaction confirmed
            </Type>
            <Type as="p" className="max-w-full truncate font-mono text-muted-foreground" variant="body">
              {txHash}
            </Type>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : null}

        {step === "error" ? (
          <div className="mt-8 grid justify-items-center gap-4 py-6 text-center">
            <WarningCircle aria-hidden="true" className="size-12 text-warning" weight="fill" />
            <Type as="p" variant="body-strong">
              {errorMessage}
            </Type>
            <Button onClick={() => setStep("review")} variant="secondary">
              Try again
            </Button>
          </div>
        ) : null}

        <div className={cn(step === "asset" ? "mt-5" : "hidden")}>
          <Type as="p" className="text-center text-muted-foreground" variant="caption">
            Zero-balance assets are hidden.
          </Type>
        </div>
      </ModalContent>
    </Modal>
  );
}
