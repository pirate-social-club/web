/** @jsxImportSource @solidjs/web */

import { createMemo, Show } from "solid-js";

import { Card, Type } from "../../design-system";
import { buildGroupedAssets, formatTotalBalanceUsd } from "./wallet-hub-model";
import { DesktopWalletHub, MobileWalletHub } from "./wallet-hub-view";
import type { WalletHubProps } from "./wallet-hub.types";

export function WalletHub(props: WalletHubProps) {
  const groupedAssets = createMemo(() => buildGroupedAssets(props.chainSections));
  const resolvedTotalBalanceUsd = createMemo(() => props.totalBalanceUsd ?? formatTotalBalanceUsd(props.chainSections));
  const claimableWipWei = () => props.claimableWipWei ?? "0";

  return (
    <Show
      when={groupedAssets().length > 0 || props.walletAddress || props.walletActionsPending}
      fallback={
        <Card class="border-border bg-card px-5 py-10 text-muted-foreground shadow-none sm:px-6">
          No wallet connected
        </Card>
      }
    >
      <DesktopWalletHub
        chainSections={props.chainSections}
        claimLoading={props.claimLoading}
        claimableWipWei={claimableWipWei()}
        onClaim={props.onClaim}
        onReceive={props.onReceive}
        onSend={props.onSend}
        onViewActivity={props.onViewActivity}
        recentActivity={props.recentActivity}
        rewardsSummary={props.rewardsSummary}
        totalBalanceUsd={resolvedTotalBalanceUsd()}
        title={props.title ?? "Wallet"}
        variant={props.variant ?? "route"}
        walletAddress={props.walletAddress}
        walletActionsPending={props.walletActionsPending}
        walletLabel={props.walletLabel}
      />
      <MobileWalletHub
        chainSections={props.chainSections}
        claimLoading={props.claimLoading}
        claimableWipWei={claimableWipWei()}
        onClaim={props.onClaim}
        onReceive={props.onReceive}
        onSend={props.onSend}
        recentActivity={props.recentActivity}
        rewardsSummary={props.rewardsSummary}
        totalBalanceUsd={resolvedTotalBalanceUsd()}
        variant={props.variant ?? "route"}
        walletAddress={props.walletAddress}
        walletActionsPending={props.walletActionsPending}
      />
    </Show>
  );
}
