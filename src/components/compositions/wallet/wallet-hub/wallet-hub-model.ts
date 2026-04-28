import type {
  WalletHubChainId,
  WalletHubChainSection,
  WalletHubToken,
} from "./wallet-hub.types";

export type WalletFamilyId = "ethereum" | "tempo" | "solana" | "bitcoin" | "cosmos";

export type WalletFamily = {
  id: WalletFamilyId;
  address: string | null;
  assets: Array<WalletHubToken & { chainId: WalletHubChainId; chainTitle: string }>;
  title: string;
};

export type GroupedAsset = {
  symbol: string;
  name: string;
  totalBalance: string;
  totalFiatValue: string | null;
  iconChainId: WalletHubChainId;
  breakdowns: Array<{
    chainId: WalletHubChainId;
    chainTitle: string;
    balance: string;
    fiatValue: string | null;
  }>;
};

export type WalletHubAssetRow = {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  fiatValue: string | null;
  chainId: WalletHubChainId;
  chainTitle: string;
};

export function getWalletFamilyId(chainId: WalletHubChainId): WalletFamilyId {
  switch (chainId) {
    case "ethereum":
    case "base":
    case "optimism":
    case "story":
      return "ethereum";
    case "tempo":
    case "solana":
    case "bitcoin":
    case "cosmos":
      return chainId;
  }
}

export function getWalletFamilyTitle(id: WalletFamilyId) {
  if (id === "ethereum") return "Ethereum";
  if (id === "tempo") return "Tempo";
  if (id === "solana") return "Solana";
  if (id === "bitcoin") return "Bitcoin";
  return "Cosmos";
}

export function getWalletFamilyChainIcon(id: WalletFamilyId): WalletHubChainId {
  if (id === "ethereum") return "ethereum";
  if (id === "tempo") return "tempo";
  if (id === "solana") return "solana";
  if (id === "bitcoin") return "bitcoin";
  return "cosmos";
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function buildWalletFamilies({
  chainSections,
  walletAddress,
}: {
  chainSections: WalletHubChainSection[];
  walletAddress?: string | null;
}): WalletFamily[] {
  const grouped = new Map<WalletFamilyId, WalletFamily>();

  for (const section of chainSections) {
    const familyId = getWalletFamilyId(section.chainId);
    const existing = grouped.get(familyId);

    if (!existing) {
      grouped.set(familyId, {
        id: familyId,
        title: getWalletFamilyTitle(familyId),
        address: section.walletAddress ?? walletAddress ?? null,
        assets: section.tokens.map((token) => ({
          ...token,
          chainId: section.chainId,
          chainTitle: section.title,
        })),
      });
      continue;
    }

    if (!existing.address && (section.walletAddress || walletAddress)) {
      existing.address = section.walletAddress ?? walletAddress ?? null;
    }

    existing.assets.push(...section.tokens.map((token) => ({
      ...token,
      chainId: section.chainId,
      chainTitle: section.title,
    })));
  }

  const familyOrder: WalletFamilyId[] = ["ethereum", "bitcoin", "solana", "tempo", "cosmos"];
  return familyOrder.flatMap((familyId) => {
    const family = grouped.get(familyId);
    return family ? [family] : [];
  });
}

function parseBalance(value: string): number {
  return Number.parseFloat(value.replace(/,/g, ""));
}

function formatSummedBalance(total: number): string {
  if (!Number.isFinite(total)) return "0";
  if (total === 0) return "0";
  return total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function sumFiatValues(values: (string | null | undefined)[]): string | null {
  let total = 0;
  for (const v of values) {
    if (!v) continue;
    const num = Number.parseFloat(v.replace(/[$,]/g, ""));
    if (Number.isFinite(num)) total += num;
  }
  if (total === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total);
}

export function formatUsdValue(token: WalletHubToken) {
  if (token.fiatValue) return token.fiatValue;
  if (!token.balance || typeof token.usdPrice !== "number") return null;
  const balance = Number.parseFloat(token.balance.replace(/,/g, ""));
  if (!Number.isFinite(balance)) return null;
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(balance * token.usdPrice);
}

export function formatTotalBalanceUsd(chainSections: WalletHubChainSection[]): string {
  let total = 0;

  for (const section of chainSections) {
    for (const token of section.tokens) {
      const fiatValue = token.fiatValue ?? formatUsdValue(token);
      if (!fiatValue) continue;
      const amount = Number.parseFloat(fiatValue.replace(/[$,]/g, ""));
      if (Number.isFinite(amount)) {
        total += amount;
      }
    }
  }

  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(total);
}

export function hasNonZeroBalance(token: WalletHubToken): boolean {
  if (!token.balance) return false;
  const num = Number.parseFloat(token.balance.replace(/,/g, ""));
  return Number.isFinite(num) && num > 0;
}

export function buildGroupedAssets(chainSections: WalletHubChainSection[]): GroupedAsset[] {
  const groups = new Map<string, { symbol: string; name: string; items: Array<{ chainId: WalletHubChainId; chainTitle: string; balance: string; fiatValue: string | null }> }>();

  for (const section of chainSections) {
    for (const token of section.tokens) {
      const symbol = token.symbol.toUpperCase();
      const existing = groups.get(symbol);
      const fiatValue = token.fiatValue ?? formatUsdValue(token);
      if (!existing) {
        groups.set(symbol, {
          symbol: token.symbol,
          name: token.name,
          items: [{
            chainId: section.chainId,
            chainTitle: section.title,
            balance: token.balance ?? "0",
            fiatValue,
          }],
        });
      } else {
        existing.items.push({
          chainId: section.chainId,
          chainTitle: section.title,
          balance: token.balance ?? "0",
          fiatValue,
        });
      }
    }
  }

  const result: GroupedAsset[] = [];
  for (const group of groups.values()) {
    const totalBalanceNum = group.items.reduce((sum, item) => sum + parseBalance(item.balance), 0);
    const totalFiatValue = sumFiatValues(group.items.map((i) => i.fiatValue));

    const preferredChainOrder: WalletHubChainId[] = ["ethereum", "base", "optimism", "story", "tempo", "bitcoin", "solana", "cosmos"];
    const iconChainId = preferredChainOrder.find((c) => group.items.some((i) => i.chainId === c)) ?? group.items[0]?.chainId ?? "ethereum";

    result.push({
      symbol: group.symbol,
      name: group.name,
      totalBalance: formatSummedBalance(totalBalanceNum),
      totalFiatValue,
      iconChainId,
      breakdowns: group.items,
    });
  }

  const symbolOrder: Record<string, number> = {
    ETH: 0,
    IP: 1,
    WIP: 2,
    USDC: 3,
    USDT: 4,
    DAI: 5,
    WBTC: 6,
    LINK: 7,
    BTC: 8,
    SOL: 9,
    PATHUSD: 10,
  };

  const topSymbols = new Set(["IP", "WIP"]);
  result.sort((a, b) => {
    const aIsTop = topSymbols.has(a.symbol.toUpperCase());
    const bIsTop = topSymbols.has(b.symbol.toUpperCase());
    if (aIsTop && !bIsTop) return -1;
    if (!aIsTop && bIsTop) return 1;
    if (aIsTop && bIsTop) {
      return a.symbol.toUpperCase() === "IP" ? -1 : 1;
    }
    const aFiat = a.totalFiatValue ? Number.parseFloat(a.totalFiatValue.replace(/[$,]/g, "")) : Number.NaN;
    const bFiat = b.totalFiatValue ? Number.parseFloat(b.totalFiatValue.replace(/[$,]/g, "")) : Number.NaN;
    if (Number.isFinite(aFiat) && Number.isFinite(bFiat)) {
      return bFiat - aFiat;
    }
    if (Number.isFinite(aFiat)) return -1;
    if (Number.isFinite(bFiat)) return 1;
    const aOrder = symbolOrder[a.symbol.toUpperCase()] ?? 100;
    const bOrder = symbolOrder[b.symbol.toUpperCase()] ?? 100;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.symbol.localeCompare(b.symbol);
  });

  return result;
}

export function buildWalletAssetRows(chainSections: WalletHubChainSection[]): WalletHubAssetRow[] {
  const rows = chainSections.flatMap((section) => section.tokens.map((token) => ({
    id: `${section.chainId}:${token.id}`,
    symbol: token.symbol,
    name: token.name,
    balance: token.balance ?? "0",
    fiatValue: token.fiatValue ?? formatUsdValue(token),
    chainId: section.chainId,
    chainTitle: section.title,
  })));

  const symbolOrder: Record<string, number> = {
    ETH: 0,
    IP: 1,
    WIP: 2,
    USDC: 3,
    USDT: 4,
    DAI: 5,
    WBTC: 6,
    LINK: 7,
    BTC: 8,
    SOL: 9,
    PATHUSD: 10,
  };

  const topSymbols = new Set(["IP", "WIP"]);
  rows.sort((a, b) => {
    const aSymbol = a.symbol.toUpperCase();
    const bSymbol = b.symbol.toUpperCase();
    const aIsTop = topSymbols.has(aSymbol);
    const bIsTop = topSymbols.has(bSymbol);
    if (aIsTop && !bIsTop) return -1;
    if (!aIsTop && bIsTop) return 1;
    if (aIsTop && bIsTop) return aSymbol === "IP" ? -1 : 1;

    const aFiat = a.fiatValue ? Number.parseFloat(a.fiatValue.replace(/[$,]/g, "")) : Number.NaN;
    const bFiat = b.fiatValue ? Number.parseFloat(b.fiatValue.replace(/[$,]/g, "")) : Number.NaN;
    if (Number.isFinite(aFiat) && Number.isFinite(bFiat) && aFiat !== bFiat) {
      return bFiat - aFiat;
    }
    if (Number.isFinite(aFiat) && !Number.isFinite(bFiat)) return -1;
    if (!Number.isFinite(aFiat) && Number.isFinite(bFiat)) return 1;

    const aOrder = symbolOrder[aSymbol] ?? 100;
    const bOrder = symbolOrder[bSymbol] ?? 100;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const symbolCompare = a.symbol.localeCompare(b.symbol);
    if (symbolCompare !== 0) return symbolCompare;
    return a.chainTitle.localeCompare(b.chainTitle);
  });

  return rows;
}

function isRedundantAssetLabel(
  token: WalletHubToken & { chainId?: WalletHubChainId; chainTitle?: string },
) {
  if (!token.chainTitle) return token.name.toLowerCase() === token.symbol.toLowerCase();
  const normalizedName = token.name.toLowerCase();
  return (
    normalizedName === token.symbol.toLowerCase()
    || normalizedName === token.chainTitle.toLowerCase()
    || (
      token.chainId
      && normalizedName === getWalletFamilyTitle(getWalletFamilyId(token.chainId)).toLowerCase()
    )
  );
}

export function formatAssetSubtitle(
  token: WalletHubToken & { chainId?: WalletHubChainId; chainTitle?: string },
) {
  if (!token.chainTitle) return isRedundantAssetLabel(token) ? null : token.name;
  if (token.chainId && getWalletFamilyId(token.chainId) !== "ethereum") {
    return isRedundantAssetLabel(token) ? null : token.name;
  }
  if (token.name.toLowerCase() === token.chainTitle.toLowerCase()) return token.name;
  return token.chainTitle;
}

export function formatTokenBalance(token: WalletHubToken) {
  const balance = token.balance?.trim();
  if (!balance) return `0 ${token.symbol}`;
  if (!Number.isFinite(Number.parseFloat(balance.replace(/,/g, "")))) return balance;
  return `${balance} ${token.symbol}`;
}

const TOKEN_ORDER_BY_SYMBOL: Record<string, number> = {
  ETH: 0,
  IP: 1,
  WIP: 2,
  USDC: 3,
  USDT: 4,
  DAI: 5,
  WBTC: 6,
  LINK: 7,
  BTC: 8,
  SOL: 9,
  PATHUSD: 10,
};

const CHAIN_ORDER_BY_ID: Record<WalletHubChainId, number> = {
  ethereum: 0,
  base: 1,
  optimism: 2,
  story: 3,
  bitcoin: 4,
  solana: 5,
  tempo: 6,
  cosmos: 7,
};

export function sortWalletAssets(assets: WalletFamily["assets"]) {
  return [...assets].sort((a, b) => {
    const aOrder = TOKEN_ORDER_BY_SYMBOL[a.symbol.toUpperCase()] ?? 100;
    const bOrder = TOKEN_ORDER_BY_SYMBOL[b.symbol.toUpperCase()] ?? 100;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const symbolOrder = a.symbol.localeCompare(b.symbol);
    if (symbolOrder !== 0) return symbolOrder;
    const aChainOrder = CHAIN_ORDER_BY_ID[a.chainId] ?? 100;
    const bChainOrder = CHAIN_ORDER_BY_ID[b.chainId] ?? 100;
    return aChainOrder - bChainOrder;
  });
}
