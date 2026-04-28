"use client";

import { WalletHub } from "@/components/compositions/wallet/wallet-hub/wallet-hub";
import type {
  WalletHubChainSection,
  WalletHubToken,
} from "@/components/compositions/wallet/wallet-hub/wallet-hub.types";
import type { ProfileWalletAsset } from "./profile-page.types";

type ProfileWalletChainSection = Omit<WalletHubChainSection, "tokens"> & {
  tokens: WalletHubToken[];
};

export function WalletPanel({
  walletAddress,
  walletAssets = [],
  walletChainSections,
}: {
  walletAddress?: string;
  walletAssets?: ProfileWalletAsset[];
  walletChainSections?: WalletHubChainSection[];
}) {
  const chainSections = walletChainSections ?? profileAssetsToChainSections(walletAssets, walletAddress);

  return (
    <WalletHub
      chainSections={chainSections}
      variant="embedded"
      walletAddress={walletAddress}
    />
  );
}

function profileAssetsToChainSections(
  walletAssets: ProfileWalletAsset[],
  walletAddress?: string,
): ProfileWalletChainSection[] {
  const sections = new Map<string, ProfileWalletChainSection>();

  for (const asset of walletAssets) {
    const chainId = asset.chainId ?? "ethereum";
    const existing = sections.get(chainId);
    const token = {
      id: asset.assetId,
      symbol: asset.symbol ?? asset.label,
      name: asset.name ?? asset.note ?? asset.label,
      balance: asset.value,
      fiatValue: asset.fiatValue,
    };

    if (!existing) {
      sections.set(chainId, {
        availability: "ready",
        chainId,
        title: chainTitle(chainId),
        tokens: [token],
        walletAddress,
      });
      continue;
    }

    existing.tokens.push(token);
  }

  return Array.from(sections.values());
}

function chainTitle(chainId: WalletHubChainSection["chainId"]) {
  if (chainId === "base") return "Base";
  if (chainId === "bitcoin") return "Bitcoin";
  if (chainId === "cosmos") return "Cosmos";
  if (chainId === "optimism") return "Optimism";
  if (chainId === "solana") return "Solana";
  if (chainId === "story") return "Story";
  if (chainId === "tempo") return "Tempo";
  return "Ethereum";
}
