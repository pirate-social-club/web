"use client";

import * as React from "react";
import { StoryClient, WIP_TOKEN_ADDRESS } from "@story-protocol/core-sdk";
import type { ClaimableRoyaltiesResponse } from "@pirate/api-contracts";
import { custom, defineChain } from "viem";

import { useApi } from "@/lib/api";
import { usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { getPirateNetworkConfig } from "@/lib/network-config";
import { logger } from "@/lib/logger";

function resolveStoryChainName(network: string): "aeneid" | "mainnet" {
  return network === "story-mainnet" ? "mainnet" : "aeneid";
}

function buildStoryChainConfig(storyConfig: ReturnType<typeof getPirateNetworkConfig>["story"]) {
  return defineChain({
    id: storyConfig.chainId,
    name: storyConfig.label,
    network: storyConfig.network,
    nativeCurrency: {
      decimals: 18,
      name: "IP",
      symbol: "IP",
    },
    rpcUrls: {
      default: {
        http: [storyConfig.rpcUrl],
      },
    },
  });
}

function extractClaimTxHash(result: unknown): string {
  const txHashes = Array.isArray((result as { txHashes?: unknown }).txHashes)
    ? (result as { txHashes: string[] }).txHashes
    : [];
  const txHash = typeof (result as { txHash?: unknown }).txHash === "string"
    ? (result as { txHash: string }).txHash
    : txHashes[0];
  return txHash ?? "";
}

export type RoyaltyClaimState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preparing" }
  | { status: "signing" }
  | { status: "submitting" }
  | { status: "success"; txHash: string }
  | { status: "error"; message: string };

export function useStoryRoyalties() {
  const api = useApi();
  const { connectedWallets } = usePiratePrivyWallets();
  const [claimable, setClaimable] = React.useState<ClaimableRoyaltiesResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [claimState, setClaimState] = React.useState<RoyaltyClaimState>({ status: "idle" });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.royalties.listClaimable();
      setClaimable(result);
    } catch (error) {
      logger.warn("[useStoryRoyalties] failed to fetch claimable royalties", error);
      setClaimable(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const claimRoyalties = React.useCallback(
    async (opts?: { autoUnwrapIpTokens?: boolean }) => {
      const wallet = connectedWallets[0];
      if (!wallet) {
        setClaimState({ status: "error", message: "Connect a wallet to claim royalties." });
        return;
      }

      const networkConfig = getPirateNetworkConfig();
      const storyChain = buildStoryChainConfig(networkConfig.story);

      setClaimState({ status: "preparing" });

      try {
        await wallet.switchChain(storyChain.id);
        const provider = await wallet.getEthereumProvider();

        const storyClient = StoryClient.newClient({
          account: wallet.address as `0x${string}`,
          transport: custom(provider as never),
          chainId: resolveStoryChainName(networkConfig.story.network),
        });

        const currentClaimable = claimable ?? (await api.royalties.listClaimable());
        if (currentClaimable.items.length === 0) {
          setClaimState({ status: "error", message: "No royalties available to claim." });
          return;
        }

        setClaimState({ status: "signing" });

        const ancestorIps = currentClaimable.items.map((item) => ({
          ipId: item.ip_id as `0x${string}`,
          claimer: item.ip_id as `0x${string}`,
          currencyTokens: [WIP_TOKEN_ADDRESS],
          childIpIds: [] as `0x${string}`[],
          royaltyPolicies: [] as `0x${string}`[],
        }));

        setClaimState({ status: "submitting" });
        const result = await storyClient.royalty.batchClaimAllRevenue({
          ancestorIps,
          claimOptions: {
            autoTransferAllClaimedTokensFromIp: true,
            autoUnwrapIpTokens: opts?.autoUnwrapIpTokens ?? true,
          },
        });

        const txHash = extractClaimTxHash(result);
        if (txHash) {
          await api.royalties.recordClaim({
            tx_hash: txHash,
            wallet_address: wallet.address,
            chain_id: storyChain.id,
            claimable_wip_wei_at_submission: currentClaimable.total_claimable_wip_wei,
            ip_ids: currentClaimable.items.map((item) => item.ip_id),
            auto_unwrap_ip_tokens: opts?.autoUnwrapIpTokens ?? true,
          }).catch((error) => {
            logger.warn("[useStoryRoyalties] failed to record royalty claim", error);
          });
        }
        setClaimState({ status: "success", txHash });

        // Refetch claimable after a short delay to let the chain state update
        window.setTimeout(() => {
          void refresh();
        }, 4000);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Claim failed";
        logger.warn("[useStoryRoyalties] claim failed", { message });
        setClaimState({ status: "error", message });
        throw error;
      }
    },
    [connectedWallets, claimable, api, refresh],
  );

  const resetClaimState = React.useCallback(() => {
    setClaimState({ status: "idle" });
  }, []);

  return {
    claimable,
    loading,
    refresh,
    claimRoyalties,
    claimState,
    resetClaimState,
  };
}
