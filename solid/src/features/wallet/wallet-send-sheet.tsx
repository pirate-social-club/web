/** @jsxImportSource @solidjs/web */

import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import {
  Button,
  IconCaretLeft,
  IconCheckCircle,
  IconCopy,
  IconMagnifyingGlass,
  IconWarningCircle,
  Input,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Spinner,
  Type,
} from "../../design-system";
import { cn } from "../../design-system";
import { ChainIcon, TokenChainIcon } from "./wallet-visuals";
import {
  formatShortAddress,
  getSendableAssets,
  parseDisplayNumber,
  validateAmount,
  validateEvmAddress,
} from "./wallet-send-sheet-model";
import type {
  WalletSendAsset,
  WalletSendSheetProps,
  WalletSendStep,
} from "./wallet-send-sheet.types";

function assetKey(asset: WalletSendAsset): string {
  return `${asset.chainId}:${asset.token.id}`;
}

function SummaryRow(props: { label: string; value: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-4 border-b border-border-soft py-3 last:border-b-0">
      <Type as="div" class="text-muted-foreground" variant="body">{props.label}</Type>
      <Type as="div" class="min-w-0 truncate text-end" variant="body-strong">{props.value}</Type>
    </div>
  );
}

function StepBackButton(props: { onClick: () => void }) {
  return (
    <Button aria-label="Back" class="size-10" onClick={props.onClick} size="icon" variant="ghost">
      <IconCaretLeft aria-hidden="true" class="size-5 rtl:rotate-180" />
    </Button>
  );
}

function ModalStepTitle(props: { asset: WalletSendAsset | null; children: JSX.Element; onBack: () => void }) {
  return (
    <div class="flex items-center gap-2 pe-10">
      <StepBackButton onClick={props.onBack} />
      <div class="min-w-0">
        <ModalTitle>{props.children}</ModalTitle>
        <Show when={props.asset}>
          <Type as="div" class="mt-1 truncate text-muted-foreground" variant="body">Send {props.asset?.token.symbol} on {props.asset?.chainTitle}</Type>
        </Show>
      </div>
    </div>
  );
}

function AssetStep(props: { assets: WalletSendAsset[]; onSelect: (asset: WalletSendAsset) => void }) {
  const [query, setQuery] = createSignal("");
  const filteredAssets = createMemo(() => {
    const normalized = query().toLowerCase();
    return props.assets.filter((asset) => `${asset.chainTitle} ${asset.token.symbol} ${asset.token.name}`.toLowerCase().includes(normalized));
  });
  const groupedAssets = createMemo(() => filteredAssets().reduce<Record<string, WalletSendAsset[]>>((groups, asset) => {
    groups[asset.chainTitle] = [...(groups[asset.chainTitle] ?? []), asset];
    return groups;
  }, {}));

  return (
    <div class="mt-5 space-y-4">
      <label class="relative block" for="wallet-send-asset-search">
        <IconMagnifyingGlass aria-hidden="true" class="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search assets"
          class="ps-11"
          id="wallet-send-asset-search"
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search assets"
          value={query()}
        />
      </label>

      <div class="space-y-5">
        <For each={Object.entries(groupedAssets())}>
          {([chainTitle, chainAssets]) => (
            <div>
              <Type as="div" class="mb-2 px-1 text-muted-foreground" variant="label">{chainTitle}</Type>
              <div class="overflow-hidden rounded-lg border border-border-soft">
                <For each={chainAssets}>
                  {(asset) => (
                    <button
                      class="flex min-h-16 w-full items-center gap-3 border-b border-border-soft px-4 py-3 text-start transition-colors last:border-b-0 hover:bg-muted/35"
                      onClick={() => props.onSelect(asset)}
                      type="button"
                    >
                      <TokenChainIcon chainId={asset.chainId} showChainBadge size="sm" token={asset.token} />
                      <div class="min-w-0 flex-1">
                        <Type as="div" variant="body-strong">{asset.token.symbol}</Type>
                        <Type as="div" class="truncate text-muted-foreground" variant="caption">{asset.chainTitle}</Type>
                      </div>
                      <div class="text-end">
                        <Type as="div" class="tabular-nums" variant="body">{asset.token.balance}</Type>
                        <Type as="div" class="tabular-nums text-muted-foreground" variant="caption">{asset.token.fiatValue ?? "$0.00"}</Type>
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <Show when={filteredAssets().length === 0}>
          <Type as="div" class="rounded-lg border border-border-soft p-5 text-center text-muted-foreground" variant="body">No sendable assets.</Type>
        </Show>
      </div>
    </div>
  );
}

export function WalletSendSheet(props: WalletSendSheetProps) {
  const assets = createMemo(() => getSendableAssets(props.chainSections));
  const defaultAsset = createMemo(() => assets().find((asset) => assetKey(asset) === props.defaultAssetId) ?? assets()[0] ?? null);
  const [step, setStep] = createSignal<WalletSendStep>(props.step ?? "asset");
  const [asset, setAsset] = createSignal<WalletSendAsset | null>(defaultAsset());
  const [recipient, setRecipient] = createSignal(props.defaultRecipient ?? "");
  const [amount, setAmount] = createSignal(props.amount ?? "");

  createEffect(
    () => ({
      amount: props.amount,
      asset: defaultAsset(),
      open: props.open,
      recipient: props.defaultRecipient,
      step: props.step,
    }),
    (next) => {
      if (!next.open) return;
      setStep(next.step ?? "asset");
      setAsset(next.asset);
      setRecipient(next.recipient ?? "");
      setAmount(next.amount ?? "");
    },
  );

  const activeAsset = () => asset() ?? assets()[0] ?? null;
  const recipientError = () => step() === "recipient" && recipient().trim() ? validateEvmAddress(recipient()) : null;
  const recipientIsValid = () => !validateEvmAddress(recipient());
  const amountError = () => step() === "amount" ? validateAmount(amount(), activeAsset()) : null;
  const reviewReady = () => Boolean(asset() && !validateEvmAddress(recipient()) && !validateAmount(amount(), asset()));
  const errorMessage = () => props.errorMessage ?? "Transaction failed. Check the network and try again.";
  const feeLabel = () => props.feeLabel ?? "~$0.01";
  const txHash = () => props.txHash ?? "0x4b6c9f0a8d3e2c1b7a6d5e4f3c2b1a0987654321abcdef1234567890abcdef12";

  const handleConfirm = () => {
    if (!reviewReady() || !asset()) return;
    props.onConfirm?.({ amount: amount(), asset: asset()!, recipient: recipient() });
    if (!props.onConfirm) setStep("pending");
  };

  const copyRecipient = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) void navigator.clipboard.writeText(recipient());
  };

  return (
    <Modal forceMobile={props.forceMobile} onOpenChange={props.onOpenChange} open={props.open}>
      <ModalContent
        class={cn(
          "flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-[var(--radius-3xl)] border-x-0 border-b-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4",
          !props.forceMobile && "md:w-[min(100%-2rem,38rem)] md:max-w-[38rem] md:px-7 md:pb-7 md:pt-7",
        )}
        mobileSide="bottom"
      >
        <div aria-hidden="true" class={cn("mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/60", !props.forceMobile && "md:hidden")} />
        <ModalHeader class="text-start">
          <Show when={step() === "asset"}>
            <ModalTitle>Send</ModalTitle>
            <ModalDescription class="text-muted-foreground">Choose the asset and network first.</ModalDescription>
          </Show>
          <Show when={step() === "recipient"}><ModalStepTitle asset={activeAsset()} onBack={() => setStep("asset")}>Recipient</ModalStepTitle></Show>
          <Show when={step() === "amount"}><ModalStepTitle asset={activeAsset()} onBack={() => setStep("recipient")}>Amount</ModalStepTitle></Show>
          <Show when={step() === "review"}><ModalStepTitle asset={activeAsset()} onBack={() => setStep("amount")}>Review send</ModalStepTitle></Show>
          <Show when={step() === "pending"}><ModalTitle>Submitting transaction</ModalTitle></Show>
          <Show when={step() === "success"}><ModalTitle>Send complete</ModalTitle></Show>
          <Show when={step() === "error"}><ModalTitle>Send failed</ModalTitle></Show>
        </ModalHeader>

        <Show when={step() === "asset"}>
          <AssetStep assets={assets()} onSelect={(nextAsset) => { setAsset(nextAsset); setStep("recipient"); }} />
        </Show>

        <Show when={step() === "recipient" && activeAsset()}>
          <div class="mt-6 space-y-4">
            <Input
              aria-invalid={recipientError() ? "true" : undefined}
              onInput={(event) => { setRecipient(event.currentTarget.value); }}
              placeholder="0x..."
              size="lg"
              value={recipient()}
            />
            <Show when={recipient() && !recipientError()}><Type as="p" class="text-success" variant="body">Address format looks valid.</Type></Show>
            <Show when={recipientError()}><Type as="p" class="text-warning" variant="body">{recipientError()}</Type></Show>
            <Button class="h-14 w-full" disabled={!recipientIsValid()} onClick={() => setStep("amount")}>Continue to amount</Button>
          </div>
        </Show>

        <Show when={step() === "amount" && activeAsset()}>
          <div class="mt-6 space-y-4">
            <div class="flex gap-3">
              <Input aria-invalid={amountError() ? "true" : undefined} inputmode="decimal" onInput={(event) => { setAmount(event.currentTarget.value); }} placeholder="0.00" size="lg" value={amount()} />
              <Button class="h-16 shrink-0" onClick={() => setAmount(activeAsset()?.token.balance ?? "0")} variant="secondary">Max</Button>
            </div>
            <div class="space-y-1">
              <Type as="p" class="text-muted-foreground" variant="body">Available: {activeAsset()?.token.balance ?? "0"} {activeAsset()?.token.symbol}</Type>
              <Type as="p" class="text-muted-foreground" variant="body">Network fee: {feeLabel()} ({activeAsset()?.chainId === "story" ? "IP" : "ETH"})</Type>
              <Show when={amount()}><Type as="p" variant="body">You will send: {parseDisplayNumber(amount()).toLocaleString("en-US")} {activeAsset()?.token.symbol}</Type></Show>
            </div>
            <Show when={amountError()}><Type as="p" class="text-warning" variant="body">{amountError()}</Type></Show>
            <Button class="h-14 w-full" disabled={Boolean(amountError())} onClick={() => setStep("review")}>Review</Button>
          </div>
        </Show>

        <Show when={step() === "review" && activeAsset()}>
          <div class="mt-6">
            <div class="rounded-lg border border-border-soft px-4">
              <SummaryRow label="Asset" value={activeAsset()?.token.symbol ?? ""} />
              <SummaryRow label="Amount" value={`${amount()} ${activeAsset()?.token.symbol ?? ""}`} />
              <SummaryRow label="Network" value={<span class="inline-flex min-w-0 items-center justify-end gap-2"><ChainIcon chainId={activeAsset()?.chainId ?? "ethereum"} class="size-5" framed={false} /><span class="truncate">{activeAsset()?.chainTitle}</span></span>} />
              <SummaryRow label="Recipient" value={<span class="inline-flex min-w-0 items-center justify-end gap-2"><span class="truncate">{formatShortAddress(recipient())}</span><Button aria-label="Copy recipient" class="size-8" onClick={copyRecipient} size="icon" variant="ghost"><IconCopy aria-hidden="true" class="size-4" /></Button></span>} />
              <SummaryRow label="Fee" value={feeLabel()} />
              <SummaryRow label="Total debited" value={`${amount() || "0"} ${activeAsset()?.token.symbol ?? ""} + fee`} />
            </div>
            <ModalFooter class="mt-6 gap-3 sm:justify-end">
              <Button onClick={() => props.onOpenChange(false)} variant="secondary">Cancel</Button>
              <Button onClick={handleConfirm}>Confirm send</Button>
            </ModalFooter>
          </div>
        </Show>

        <Show when={step() === "pending"}>
          <div aria-live="polite" class="mt-8 grid justify-items-center gap-4 py-8 text-center" role="status">
            <Spinner aria-hidden="true" class="size-10 text-muted-foreground" />
            <Type as="p" variant="body-strong">Submitting transaction&hellip;</Type>
          </div>
        </Show>

        <Show when={step() === "success"}>
          <div aria-live="polite" class="mt-8 grid justify-items-center gap-4 py-6 text-center" role="status">
            <IconCheckCircle aria-hidden="true" class="size-12 text-success" />
            <Type as="p" variant="body-strong">Transaction confirmed</Type>
            <Type as="p" class="max-w-full truncate text-muted-foreground" variant="body">{txHash()}</Type>
            <Button onClick={() => props.onOpenChange(false)}>Close send sheet</Button>
          </div>
        </Show>

        <Show when={step() === "error"}>
          <div aria-live="assertive" class="mt-8 grid justify-items-center gap-4 py-6 text-center" role="alert">
            <IconWarningCircle aria-hidden="true" class="size-12 text-warning" />
            <Type as="p" variant="body-strong">{errorMessage()}</Type>
            <Button onClick={() => setStep("review")} variant="secondary">Try again</Button>
          </div>
        </Show>

        <Show when={step() === "asset"}>
          <Type as="p" class="mt-5 text-center text-muted-foreground" variant="caption">Zero-balance assets are hidden.</Type>
        </Show>
      </ModalContent>
    </Modal>
  );
}
