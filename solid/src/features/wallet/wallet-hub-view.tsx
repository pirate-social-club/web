/** @jsxImportSource @solidjs/web */

import { For, Show } from "solid-js";

import {
  Button,
  Card,
  IconCaretRight,
  Type,
} from "../../design-system";
import { FullBleedMobileListSection } from "../shell/page-shell";
import {
  buildWalletAssetRows,
  type WalletHubAssetRow,
} from "./wallet-hub-model";
import { TokenChainIcon } from "./wallet-visuals";
import type {
  WalletHubActivityItem,
  WalletHubChainSection,
  WalletHubRewardsSummary,
} from "./wallet-hub.types";

function formatWipAmount(wei: string): string {
  try {
    const value = BigInt(wei);
    const base = 10n ** 18n;
    const whole = value / base;
    const fraction = value % base;
    const fractionText = fraction.toString().padStart(18, "0").slice(0, 4).replace(/0+$/u, "");
    return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
  } catch {
    return "0";
  }
}

function isZeroUsdAmount(value: string | null | undefined): boolean {
  if (!value) return true;
  const amount = Number.parseFloat(value.replace(/[$,]/g, ""));
  return Number.isFinite(amount) ? amount === 0 : false;
}

function DesktopAssetRow(props: { asset: WalletHubAssetRow }) {
  return (
    <div class="flex items-center gap-4 border-b border-border p-3 last:border-b-0">
      <TokenChainIcon
        chainId={props.asset.chainId}
        chainLabel={props.asset.chainTitle}
        showChainBadge={props.asset.chainId !== "bitcoin"}
        size="sm"
        token={props.asset}
      />
      <div class="flex-1"><Type as="div" variant="body-strong">{props.asset.symbol}</Type></div>
      <div class="min-w-22 text-end">
        <Type as="div" class="tabular-nums" variant="body">{props.asset.balance}</Type>
        <Type as="div" class="tabular-nums text-muted-foreground" variant="caption">{props.asset.fiatValue ?? "$0.00"}</Type>
      </div>
    </div>
  );
}

function MobileAssetRow(props: { asset: WalletHubAssetRow }) {
  return (
    <div class="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <TokenChainIcon
        chainId={props.asset.chainId}
        chainLabel={props.asset.chainTitle}
        showChainBadge={props.asset.chainId !== "bitcoin"}
        size="sm"
        token={props.asset}
      />
      <div class="flex-1"><Type as="div" variant="body-strong">{props.asset.symbol}</Type></div>
      <div class="min-w-18 text-end">
        <Type as="div" class="tabular-nums" variant="body">{props.asset.balance}</Type>
        <Type as="div" class="tabular-nums text-muted-foreground" variant="caption">{props.asset.fiatValue ?? "$0.00"}</Type>
      </div>
    </div>
  );
}

function RoyaltiesCard(props: {
  claimLoading?: boolean;
  claimableWipWei?: string;
  onClaim?: () => void;
}) {
  const hasClaimable = () => Boolean(props.claimableWipWei && props.claimableWipWei !== "0");
  return (
    <Card class="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">
      <Type as="div" class="text-muted-foreground" variant="body">Royalties</Type>
      <Type as="div" class="mt-0.5" variant="h1">
        ${hasClaimable() ? formatWipAmount(props.claimableWipWei ?? "0") : "0.00"}
      </Type>
      <Button class="mt-4 h-12 w-full" disabled={!hasClaimable()} loading={props.claimLoading} onClick={() => props.onClaim?.()}>
        Claim
      </Button>
    </Card>
  );
}

function RewardsSummaryCard(props: { rewardsSummary: WalletHubRewardsSummary }) {
  return (
    <Card class="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">
      <Type as="div" class="text-muted-foreground" variant="body">Bounties</Type>
      <Type as="div" class="mt-0.5" variant="h1">{props.rewardsSummary.amountLabel}</Type>
      <Button
        class="mt-4 h-12 w-full"
        disabled={props.rewardsSummary.actionDisabled}
        loading={props.rewardsSummary.pending}
        onClick={() => props.rewardsSummary.onAction?.()}
      >
        {props.rewardsSummary.actionLabel}
      </Button>
    </Card>
  );
}

export interface WalletHubViewProps {
  claimLoading?: boolean;
  claimableWipWei?: string;
  onClaim?: () => void;
  onReceive?: () => void;
  onSend?: () => void;
  onViewActivity?: () => void;
  rewardsSummary?: WalletHubRewardsSummary;
  totalBalanceUsd?: string | null;
  title?: string;
  variant?: "route" | "embedded";
  walletLabel?: string;
  walletAddress?: string | null;
  walletActionsPending?: boolean;
  chainSections: WalletHubChainSection[];
  recentActivity?: WalletHubActivityItem[];
}

function AssetList(props: { assets: WalletHubAssetRow[]; mobile?: boolean }) {
  return (
    <>
      <For each={props.assets}>{(asset) => props.mobile ? <MobileAssetRow asset={asset} /> : <DesktopAssetRow asset={asset} />}</For>
      <Show when={props.assets.length === 0}>
        <Type as="div" class={props.mobile ? "px-5 py-6 text-center text-muted-foreground" : "py-6 text-center text-muted-foreground"} variant="body">
          No assets yet.
        </Type>
      </Show>
    </>
  );
}

export function DesktopWalletHub(props: WalletHubViewProps) {
  const assets = () => buildWalletAssetRows(props.chainSections);
  const sendDisabled = () => Boolean(props.walletActionsPending || isZeroUsdAmount(props.totalBalanceUsd));
  const receiveDisabled = () => Boolean(props.walletActionsPending || !props.walletAddress);
  const showWalletActions = () => props.variant === "route" && (Boolean(props.walletAddress) || Boolean(props.walletActionsPending));
  const balanceBlock = () => (
    <>
      <Type as="div" class="text-muted-foreground" variant="body">Balance</Type>
      <Type as="div" class="mt-0.5" variant="h1">{props.totalBalanceUsd ?? "$0.00"}</Type>
      <Show when={showWalletActions()}>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <Button class="h-12" disabled={sendDisabled() || !props.onSend} onClick={() => props.onSend?.()} variant="outline">Send</Button>
          <Button class="h-12" disabled={receiveDisabled() || !props.onReceive} onClick={() => props.onReceive?.()} variant="outline">Receive</Button>
        </div>
      </Show>
    </>
  );

  return (
    <div class="hidden py-8 md:block">
      <Show when={props.variant !== "embedded"}>
        <div class="mb-7">
          <Type as="h1" variant="h1">{props.title ?? "Wallet"}</Type>
          <Show when={props.walletLabel}><Type as="p" class="mt-1 text-muted-foreground" variant="body">{props.walletLabel}</Type></Show>
        </div>
      </Show>

      <Show
        when={props.variant !== "embedded"}
        fallback={
          <Card class="overflow-hidden rounded-2xl border-border bg-card shadow-none">
            <div class="p-5 md:p-6">{balanceBlock()}</div>
            <div class="border-t border-border px-5 py-2 md:px-6"><AssetList assets={assets()} /></div>
          </Card>
        }
      >
        <Show
          when={props.rewardsSummary}
          fallback={
            <div class="mb-4 grid grid-cols-[2fr_1fr] gap-4">
              <Card class="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">{balanceBlock()}</Card>
              <RoyaltiesCard claimLoading={props.claimLoading} claimableWipWei={props.claimableWipWei} onClaim={props.onClaim} />
            </div>
          }
        >
          {(summary) => (
            <div class="mb-4 space-y-4">
              <Card class="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">{balanceBlock()}</Card>
              <div class="grid grid-cols-2 gap-4">
                <RoyaltiesCard claimLoading={props.claimLoading} claimableWipWei={props.claimableWipWei} onClaim={props.onClaim} />
                <RewardsSummaryCard rewardsSummary={summary()} />
              </div>
            </div>
          )}
        </Show>
        <Card class="rounded-2xl border-border bg-card px-5 py-4 shadow-none">
          <Show when={props.onViewActivity}>
            <div class="mb-3 flex items-center justify-end">
              <button class="flex items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground" onClick={() => props.onViewActivity?.()} type="button">
                <Type as="span" variant="body-strong">Activity</Type><IconCaretRight aria-hidden="true" class="size-4" />
              </button>
            </div>
          </Show>
          <AssetList assets={assets()} />
        </Card>
      </Show>
    </div>
  );
}

export function MobileWalletHub(props: WalletHubViewProps) {
  const assets = () => buildWalletAssetRows(props.chainSections);
  const hasClaimable = () => Boolean(props.claimableWipWei && props.claimableWipWei !== "0");
  const sendDisabled = () => Boolean(props.walletActionsPending || isZeroUsdAmount(props.totalBalanceUsd));
  const receiveDisabled = () => Boolean(props.walletActionsPending || !props.walletAddress);
  const showWalletActions = () => props.variant === "route" && (Boolean(props.walletAddress) || Boolean(props.walletActionsPending));
  const balanceSummary = () => (
    <>
      <Type as="div" class="text-muted-foreground" variant="body">Balance</Type>
      <Type as="div" class="mt-0.5" variant="h2">{props.totalBalanceUsd ?? "$0.00"}</Type>
      <Show when={showWalletActions()}>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <Button class="h-14" disabled={sendDisabled() || !props.onSend} onClick={() => props.onSend?.()} variant="outline">Send</Button>
          <Button class="h-14" disabled={receiveDisabled() || !props.onReceive} onClick={() => props.onReceive?.()} variant="outline">Receive</Button>
        </div>
      </Show>
    </>
  );

  return (
    <div class="flex min-w-0 flex-1 flex-col md:hidden">
      <div class="flex min-w-0 flex-1 flex-col gap-0">
        <Show
          when={props.variant === "route"}
          fallback={<div class="py-4">{balanceSummary()}</div>}
        >
          <div class="py-4">{balanceSummary()}</div>
          <div class="border-t border-border py-4">
            <Type as="div" class="text-muted-foreground" variant="body">Royalties</Type>
            <Type as="div" class="mt-0.5" variant="h1">${hasClaimable() ? formatWipAmount(props.claimableWipWei ?? "0") : "0.00"}</Type>
            <Button class="mt-4 h-14 w-full" disabled={!hasClaimable()} loading={props.claimLoading} onClick={() => props.onClaim?.()}>Claim</Button>
          </div>
          <Show when={props.rewardsSummary}>
            {(summary) => (
              <div class="border-t border-border py-4">
                <Type as="div" class="text-muted-foreground" variant="body">Bounties</Type>
                <Type as="div" class="mt-0.5" variant="h1">{summary().amountLabel}</Type>
                <Button class="mt-4 h-14 w-full" disabled={summary().actionDisabled} loading={summary().pending} onClick={() => summary().onAction?.()}>{summary().actionLabel}</Button>
              </div>
            )}
          </Show>
        </Show>
        <FullBleedMobileListSection class="border-y border-border">
          <AssetList assets={assets()} mobile />
        </FullBleedMobileListSection>
      </div>
    </div>
  );
}
