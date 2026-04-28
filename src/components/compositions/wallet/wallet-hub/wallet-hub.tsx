"use client";

import * as React from "react";

import { Card } from "@/components/primitives/card";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { buildGroupedAssets, formatTotalBalanceUsd } from "./wallet-hub-model";
export { buildGroupedAssets, formatTotalBalanceUsd } from "./wallet-hub-model";
export { MobileWalletHub } from "./wallet-hub-view";
import { DesktopWalletHub, MobileWalletHub } from "./wallet-hub-view";
import type { WalletHubProps } from "./wallet-hub.types";

export function WalletHub({
  variant = "route",
  title,
  walletLabel,
  walletAddress,
  walletActionsPending = false,
  totalBalanceUsd,
  claimableWipWei = "0",
  claimLoading = false,
  onClaim,
  onReceive,
  onSend,
  onViewActivity,
  chainSections,
  recentActivity,
}: WalletHubProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  const groupedAssets = React.useMemo(() => buildGroupedAssets(chainSections), [chainSections]);
  const resolvedTotalBalanceUsd = totalBalanceUsd ?? formatTotalBalanceUsd(chainSections);

  if (groupedAssets.length === 0 && !walletAddress && !walletActionsPending) {
    return (
      <Card className="border-border bg-card px-5 py-10 text-muted-foreground shadow-none sm:px-6">
        {copy.noWalletConnected}
      </Card>
    );
  }

  return (
    <>
      <DesktopWalletHub
        chainSections={chainSections}
        claimLoading={claimLoading}
        claimableWipWei={claimableWipWei}
        onClaim={onClaim}
        onReceive={onReceive}
        onSend={onSend}
        onViewActivity={onViewActivity}
        recentActivity={recentActivity}
        totalBalanceUsd={resolvedTotalBalanceUsd}
        title={title ?? copy.title}
        variant={variant}
        walletAddress={walletAddress}
        walletActionsPending={walletActionsPending}
        walletLabel={walletLabel}
      />
      <MobileWalletHub
        chainSections={chainSections}
        claimLoading={claimLoading}
        claimableWipWei={claimableWipWei}
        onClaim={onClaim}
        onReceive={onReceive}
        onSend={onSend}
        recentActivity={recentActivity}
        totalBalanceUsd={resolvedTotalBalanceUsd}
        variant={variant}
        walletAddress={walletAddress}
        walletActionsPending={walletActionsPending}
      />
    </>
  );
}
