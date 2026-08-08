import type {
  WalletHubChainId,
  WalletHubChainSection,
  WalletHubToken,
} from "./wallet-hub.types";

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

const usdFormatter = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });

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
  return usdFormatter.format(total);
}

function formatUsdValue(token: WalletHubToken) {
  if (token.fiatValue) return token.fiatValue;
  if (!token.balance || typeof token.usdPrice !== "number") return null;
  const balance = Number.parseFloat(token.balance.replace(/,/g, ""));
  if (!Number.isFinite(balance)) return null;
  return usdFormatter.format(balance * token.usdPrice);
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

  return usdFormatter.format(total);
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
    const availableChainIds = new Set(group.items.map((item) => item.chainId));
    let iconChainId = group.items[0]?.chainId ?? "ethereum";
    for (const chainId of preferredChainOrder) {
      if (availableChainIds.has(chainId)) {
        iconChainId = chainId;
        break;
      }
    }

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
