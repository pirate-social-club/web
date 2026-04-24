export type WalletHubChainId =
  | "ethereum"
  | "base"
  | "optimism"
  | "story"
  | "tempo"
  | "solana"
  | "bitcoin"
  | "cosmos";

export type WalletHubChainAvailability = "ready" | "later";

export interface WalletHubToken {
  id: string;
  symbol: string;
  name: string;
  balance?: string;
  fiatValue?: string;
  priceId?: string;
  usdPrice?: number | null;
}

export interface WalletHubChainSection {
  chainId: WalletHubChainId;
  title: string;
  availability: WalletHubChainAvailability;
  walletAddress?: string | null;
  tokens: WalletHubToken[];
  note?: string;
}

export interface WalletHubProps {
  title?: string;
  walletLabel?: string;
  walletAddress?: string | null;
  onChangeWallet?: () => void;
  chainSections: WalletHubChainSection[];
}
