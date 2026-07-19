"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { FullBleedMobileListSection } from "@/components/compositions/app/page-shell";
import { Type } from "@/components/primitives/type";
import type { WalletHubActivityItem, WalletHubChainSection, WalletHubRewardsSummary } from "./wallet-hub.types";
import {
  buildWalletAssetRows,
  type WalletHubAssetRow,
} from "./wallet-hub-model";
import { TokenChainIcon } from "./wallet-visuals";
import { useUiLocale } from "@/lib/ui-locale";

function formatWipAmount(wei: string): string {
  try {
    const base = 10n ** 18n;
    const value = BigInt(wei);
    const whole = value / base;
    const fraction = value % base;
    const fractionText = fraction.toString().padStart(18, "0").slice(0, 4).replace(/0+$/u, "");
    return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
  } catch {
    return "0";
  }
}

function DesktopAssetRow({ asset }: { asset: WalletHubAssetRow }) {
  return (
    <div className="flex items-center gap-4 border-b border-border p-3 last:border-b-0">
      <TokenChainIcon
        chainId={asset.chainId}
        chainLabel={asset.chainTitle}
        showChainBadge={asset.chainId !== "bitcoin"}
        token={{ name: asset.name, symbol: asset.symbol }}
        size="sm"
      />
      <div className="flex-1">
        <Type as="div" variant="body-strong" className="text-foreground">
          {asset.symbol}
        </Type>
      </div>
      <div className="min-w-[5.5rem] text-end">
        <Type as="div" variant="body" className="tabular-nums text-foreground">
          {asset.balance}
        </Type>
        <Type as="div" variant="caption" className="tabular-nums text-muted-foreground">
          {asset.fiatValue ?? "$0.00"}
        </Type>
      </div>
    </div>
  );
}

function MobileAssetRow({ asset }: { asset: WalletHubAssetRow }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <TokenChainIcon
        chainId={asset.chainId}
        chainLabel={asset.chainTitle}
        showChainBadge={asset.chainId !== "bitcoin"}
        token={{ name: asset.name, symbol: asset.symbol }}
        size="sm"
      />
      <div className="flex-1">
        <Type as="div" variant="body-strong" className="text-foreground">
          {asset.symbol}
        </Type>
      </div>
      <div className="min-w-[4.5rem] text-end">
        <Type as="div" variant="body" className="tabular-nums text-foreground">
          {asset.balance}
        </Type>
        <Type as="div" variant="caption" className="tabular-nums text-muted-foreground">
          {asset.fiatValue ?? "$0.00"}
        </Type>
      </div>
    </div>
  );
}

function RoyaltiesCard({
  claimLoading,
  claimableWipWei,
  onClaim,
}: {
  claimLoading?: boolean;
  claimableWipWei?: string;
  onClaim?: () => void;
}) {
  const hasClaimable = !!claimableWipWei && claimableWipWei !== "0";
  const formattedAmount = hasClaimable && claimableWipWei ? formatWipAmount(claimableWipWei) : "0.00";

  return (
    <Card className="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">
      <Type as="div" variant="body" className="text-muted-foreground">
        Royalties
      </Type>
      <Type as="div" variant="h1" className="mt-0.5 text-4xl font-semibold leading-tight">
        ${formattedAmount}
      </Type>
      <Button className="mt-4 h-12 w-full" onClick={onClaim} loading={claimLoading} disabled={!hasClaimable}>
        Claim
      </Button>
    </Card>
  );
}

function RewardsSummaryCard({
  rewardsSummary,
}: {
  rewardsSummary: WalletHubRewardsSummary;
}) {
  return (
    <Card className="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">
      <Type as="div" variant="body" className="text-muted-foreground">
        Rewards
      </Type>
      <Type as="div" variant="h1" className="mt-0.5 text-4xl font-semibold leading-tight">
        {rewardsSummary.amountLabel}
      </Type>
      {rewardsSummary.supportingLabel ? (
        <Type as="div" variant="caption" className="mt-1 text-muted-foreground">
          {rewardsSummary.supportingLabel}
        </Type>
      ) : null}
      <Button
        className="mt-4 h-12 w-full"
        disabled={rewardsSummary.actionDisabled}
        loading={rewardsSummary.pending}
        onClick={rewardsSummary.onAction}
      >
        {rewardsSummary.actionLabel}
      </Button>
    </Card>
  );
}

function isZeroUsdAmount(value: string | null | undefined): boolean {
  if (!value) return true;
  const amount = Number.parseFloat(value.replace(/[$,]/g, ""));
  return Number.isFinite(amount) ? amount === 0 : false;
}

export function DesktopWalletHub({
  claimLoading,
  claimableWipWei,
  onClaim,
  onReceive,
  onSend,
  onViewActivity,
  rewardsSummary,
  totalBalanceUsd,
  title,
  variant = "route",
  walletLabel,
  walletAddress,
  walletActionsPending = false,
  chainSections,
}: {
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
}) {
  const { isRtl } = useUiLocale();
  const assetRows = React.useMemo(() => buildWalletAssetRows(chainSections), [chainSections]);
  const sendDisabled = walletActionsPending || isZeroUsdAmount(totalBalanceUsd);
  const receiveDisabled = walletActionsPending || !walletAddress;
  const showWalletActions = variant === "route" && (Boolean(walletAddress) || walletActionsPending);
  const balanceBlock = (
    <>
      <Type as="div" variant="body" className="text-muted-foreground">
        Balance
      </Type>
      <Type as="div" variant="h1" className="mt-0.5 text-4xl font-semibold leading-tight">
        {totalBalanceUsd ?? "$0.00"}
      </Type>
      {showWalletActions ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12 text-base" onClick={onSend} disabled={sendDisabled || !onSend}>
            Send
          </Button>
          <Button variant="outline" className="h-12 text-base" onClick={onReceive} disabled={receiveDisabled || !onReceive}>
            Receive
          </Button>
        </div>
      ) : null}
    </>
  );

  const assetList = (
    <div>
      {assetRows.map((asset) => (
        <DesktopAssetRow key={asset.id} asset={asset} />
      ))}
      {assetRows.length === 0 ? (
        <Type as="div" variant="body" className="py-6 text-center text-muted-foreground">
          No assets yet.
        </Type>
      ) : null}
    </div>
  );

  if (variant === "embedded") {
    return (
      <Card className="hidden overflow-hidden rounded-2xl border-border bg-card shadow-none md:block">
        <div className="p-5 md:p-6">
          {balanceBlock}
        </div>
        <div className="border-t border-border px-5 py-2 md:px-6">
          {assetList}
        </div>
      </Card>
    );
  }

  return (
    <div className="hidden py-8 md:block">
      <div className="mb-7">
        <Type as="h1" variant="h1" className="text-4xl font-semibold leading-tight">
          {title ?? "Wallet"}
        </Type>
        {walletLabel ? (
          <Type as="p" variant="body" className="mt-1 text-muted-foreground">
            {walletLabel}
          </Type>
        ) : null}
      </div>

      {rewardsSummary ? (
        <div className="mb-4 space-y-4">
          <Card className="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">
            {balanceBlock}
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <RoyaltiesCard
              claimLoading={claimLoading}
              claimableWipWei={claimableWipWei}
              onClaim={onClaim}
            />
            <RewardsSummaryCard rewardsSummary={rewardsSummary} />
          </div>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-[2fr_1fr] gap-4">
          <Card className="flex flex-col justify-center rounded-2xl border-border bg-card p-5 shadow-none md:p-6">
            {balanceBlock}
          </Card>
          <RoyaltiesCard
            claimLoading={claimLoading}
            claimableWipWei={claimableWipWei}
            onClaim={onClaim}
          />
        </div>
      )}

      <Card className="rounded-2xl border-border bg-card px-5 py-4 shadow-none">
        {onViewActivity ? (
          <div className="mb-3 flex items-center justify-end">
            <button
              className="flex items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
              onClick={onViewActivity}
              type="button"
            >
              <Type as="span" variant="body-strong">Activity</Type>
              {isRtl ? <CaretLeft aria-hidden className="size-4" /> : <CaretRight aria-hidden className="size-4" />}
            </button>
          </div>
        ) : null}
        {assetList}
      </Card>
    </div>
  );
}

export function MobileWalletHub({
  claimLoading,
  claimableWipWei,
  onClaim,
  onReceive,
  onSend,
  rewardsSummary,
  totalBalanceUsd,
  variant = "route",
  walletAddress,
  walletActionsPending = false,
  chainSections,
}: {
  claimLoading?: boolean;
  claimableWipWei?: string;
  onClaim?: () => void;
  onReceive?: () => void;
  onSend?: () => void;
  rewardsSummary?: WalletHubRewardsSummary;
  totalBalanceUsd?: string | null;
  variant?: "route" | "embedded";
  walletAddress?: string | null;
  walletActionsPending?: boolean;
  chainSections: WalletHubChainSection[];
  recentActivity?: WalletHubActivityItem[];
}) {
  const assetRows = React.useMemo(() => buildWalletAssetRows(chainSections), [chainSections]);
  const hasClaimable = !!claimableWipWei && claimableWipWei !== "0";
  const sendDisabled = walletActionsPending || isZeroUsdAmount(totalBalanceUsd);
  const receiveDisabled = walletActionsPending || !walletAddress;
  const showWalletActions = variant === "route" && (Boolean(walletAddress) || walletActionsPending);
  const balanceSummary = (
    <>
      <Type as="div" variant="body" className="text-muted-foreground">
        Balance
      </Type>
      <Type as="div" variant="h2" className="mt-0.5 text-4xl font-semibold leading-tight">
        {totalBalanceUsd ?? "$0.00"}
      </Type>
      {showWalletActions ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-14 text-base" onClick={onSend} disabled={sendDisabled || !onSend}>
            Send
          </Button>
          <Button variant="outline" className="h-14 text-base" onClick={onReceive} disabled={receiveDisabled || !onReceive}>
            Receive
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col md:hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-0">
        {variant === "route" ? (
          <>
            <div className="py-4">
              {balanceSummary}
            </div>
            <div className="border-t border-border py-4">
              <Type as="div" variant="body" className="text-muted-foreground">
                Royalties
              </Type>
              <Type as="div" variant="h1" className="mt-0.5 text-4xl font-semibold leading-tight">
                ${hasClaimable ? formatWipAmount(claimableWipWei) : "0.00"}
              </Type>
              <Button className="mt-4 h-14 w-full" onClick={onClaim} loading={claimLoading} disabled={!hasClaimable}>
                Claim
              </Button>
            </div>
            {rewardsSummary ? (
              <div className="border-t border-border py-4">
                  <Type as="div" variant="body" className="text-muted-foreground">
                  Rewards
                </Type>
                <Type as="div" variant="h1" className="mt-0.5 text-4xl font-semibold leading-tight">
                  {rewardsSummary.amountLabel}
                </Type>
                {rewardsSummary.supportingLabel ? (
                  <Type as="div" variant="caption" className="mt-1 text-muted-foreground">
                    {rewardsSummary.supportingLabel}
                  </Type>
                ) : null}
                <Button
                  className="mt-4 h-14 w-full"
                  disabled={rewardsSummary.actionDisabled}
                  loading={rewardsSummary.pending}
                  onClick={rewardsSummary.onAction}
                >
                  {rewardsSummary.actionLabel}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="py-4">
            {balanceSummary}
          </div>
        )}

        <FullBleedMobileListSection className="border-y border-border">
          {assetRows.map((asset) => (
            <MobileAssetRow key={asset.id} asset={asset} />
          ))}
          {assetRows.length === 0 ? (
            <Type as="div" variant="body" className="px-5 py-6 text-center text-muted-foreground">
              No assets yet.
            </Type>
          ) : null}
        </FullBleedMobileListSection>
      </div>
    </div>
  );
}
