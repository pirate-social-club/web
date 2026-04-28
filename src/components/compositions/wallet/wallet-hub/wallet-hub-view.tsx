"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { FullBleedMobileListSection } from "@/components/compositions/app/page-shell";
import { Type } from "@/components/primitives/type";
import type { WalletHubActivityItem, WalletHubChainSection } from "./wallet-hub.types";
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
    <div className="flex items-center gap-4 border-b border-border px-3 py-3 last:border-b-0">
      <TokenChainIcon
        chainId={asset.chainId}
        chainLabel={asset.chainTitle}
        showChainBadge
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
        showChainBadge
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
    <Card className="flex flex-col justify-center rounded-2xl border-border bg-card px-5 py-5 shadow-none md:px-6 md:py-6">
      <Type as="div" variant="body" className="text-muted-foreground">
        Royalties
      </Type>
      <Type as="div" variant="h1" className="mt-0.5 text-4xl font-semibold leading-tight">
        ${formattedAmount}
      </Type>
      <Button className="mt-5 h-14 w-full" onClick={onClaim} loading={claimLoading} disabled={!hasClaimable}>
        Claim
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
  const actionDisabled = walletActionsPending || isZeroUsdAmount(totalBalanceUsd);
  const showWalletActions = variant === "route" && (Boolean(walletAddress) || walletActionsPending);
  const balanceBlock = (
    <>
      <Type as="div" variant="body" className="text-muted-foreground">
        Total balance
      </Type>
      <Type as="div" variant="h1" className="mt-0.5 text-4xl font-semibold leading-tight">
        {totalBalanceUsd ?? "$0.00"}
      </Type>
      {showWalletActions ? (
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="h-14 flex-1 text-base" onClick={onSend} disabled={actionDisabled || !onSend}>
            Send
          </Button>
          <Button variant="outline" className="h-14 flex-1 text-base" onClick={onReceive} disabled={actionDisabled || !onReceive}>
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
        <div className="px-5 py-5 md:px-6 md:py-6">
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

      <div className="mb-4 grid grid-cols-[2fr_1fr] gap-4">
        <Card className="flex flex-col justify-center rounded-2xl border-border bg-card px-5 py-5 shadow-none md:px-6 md:py-6">
          {balanceBlock}
        </Card>

        <RoyaltiesCard
          claimLoading={claimLoading}
          claimableWipWei={claimableWipWei}
          onClaim={onClaim}
        />
      </div>

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
  totalBalanceUsd,
  variant = "route",
  walletAddress,
  walletActionsPending = false,
  chainSections,
  recentActivity,
}: {
  claimLoading?: boolean;
  claimableWipWei?: string;
  onClaim?: () => void;
  onReceive?: () => void;
  onSend?: () => void;
  totalBalanceUsd?: string | null;
  variant?: "route" | "embedded";
  walletAddress?: string | null;
  walletActionsPending?: boolean;
  chainSections: WalletHubChainSection[];
  recentActivity?: WalletHubActivityItem[];
}) {
  const assetRows = React.useMemo(() => buildWalletAssetRows(chainSections), [chainSections]);
  const hasClaimable = !!claimableWipWei && claimableWipWei !== "0";
  const actionDisabled = walletActionsPending || isZeroUsdAmount(totalBalanceUsd);
  const showWalletActions = variant === "route" && (Boolean(walletAddress) || walletActionsPending);
  const balanceSummary = (
    <>
      <Type as="div" variant="body" className="text-muted-foreground">
        Total balance
      </Type>
      <Type as="div" variant="h2" className="mt-0.5 text-4xl font-semibold leading-tight">
        {totalBalanceUsd ?? "$0.00"}
      </Type>
      {showWalletActions ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-14 text-base" onClick={onSend} disabled={actionDisabled || !onSend}>
            Send
          </Button>
          <Button variant="outline" className="h-14 text-base" onClick={onReceive} disabled={actionDisabled || !onReceive}>
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
