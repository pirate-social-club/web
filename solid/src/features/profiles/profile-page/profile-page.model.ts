import type { ProfilePageRightRail, ProfilePageTab, ProfileWalletAsset } from "./profile-page.types";
import type { WalletHubChainSection } from "../../wallet/wallet-hub.types";

export const PROFILE_ACTIVITY_TABS: readonly ProfilePageTab[] = ["overview", "posts", "comments", "wallet", "book"];

export function hasProfileWallet(rightRail: ProfilePageRightRail): boolean {
  return Boolean(rightRail.walletAddress || rightRail.walletAssets?.length || rightRail.walletChainSections?.length);
}

export function resolveProfileTab(requested: ProfilePageTab | undefined, hasWallet: boolean, hasBook = false): ProfilePageTab {
  if (requested === "wallet" && !hasWallet) return "overview";
  if (requested === "book" && !hasBook) return "overview";
  return requested && PROFILE_ACTIVITY_TABS.includes(requested) ? requested : "overview";
}

export function profileWalletChainSections(
  walletAssets: ProfileWalletAsset[] = [],
  walletAddress?: string,
): WalletHubChainSection[] {
  const sections = new Map<string, WalletHubChainSection>();
  for (const asset of walletAssets) {
    const chainId = asset.chainId ?? "ethereum";
    const current = sections.get(chainId);
    const token = {
      id: asset.assetId,
      name: asset.name ?? asset.note ?? asset.label,
      symbol: asset.symbol ?? asset.label,
      balance: asset.value,
      fiatValue: asset.fiatValue,
    };
    if (current) current.tokens.push(token);
    else sections.set(chainId, {
      availability: "ready",
      chainId,
      title: chainTitle(chainId),
      tokens: [token],
      walletAddress,
    });
  }
  return Array.from(sections.values());
}

function chainTitle(chainId: WalletHubChainSection["chainId"]): string {
  if (chainId === "base") return "Base";
  if (chainId === "bitcoin") return "Bitcoin";
  if (chainId === "cosmos") return "Cosmos";
  if (chainId === "optimism") return "Optimism";
  if (chainId === "solana") return "Solana";
  if (chainId === "story") return "Story";
  if (chainId === "tempo") return "Tempo";
  return "Ethereum";
}
