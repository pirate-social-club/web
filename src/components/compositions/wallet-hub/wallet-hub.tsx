"use client";

import * as React from "react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { CopyField } from "@/components/primitives/copy-field";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { ChainIcon, TokenChainIcon } from "./wallet-visuals";

import type {
  WalletHubChainId,
  WalletHubChainSection,
  WalletHubProps,
  WalletHubToken,
} from "./wallet-hub.types";

type WalletFamilyId = "ethereum" | "tempo" | "solana" | "bitcoin" | "cosmos";

type WalletFamily = {
  id: WalletFamilyId;
  address: string | null;
  assets: Array<WalletHubToken & { chainId: WalletHubChainId }>;
  title: string;
};

function getWalletFamilyId(chainId: WalletHubChainId): WalletFamilyId {
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

function getWalletFamilyTitle(id: WalletFamilyId) {
  if (id === "ethereum") return "Ethereum";
  if (id === "tempo") return "Tempo";
  if (id === "solana") return "Solana";
  if (id === "bitcoin") return "Bitcoin";
  return "Cosmos";
}

function getWalletFamilyChainIcon(id: WalletFamilyId): WalletHubChainId {
  if (id === "ethereum") return "ethereum";
  if (id === "tempo") return "tempo";
  if (id === "solana") return "solana";
  if (id === "bitcoin") return "bitcoin";
  return "cosmos";
}

function buildWalletFamilies({
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
    })));
  }

  const familyOrder: WalletFamilyId[] = ["ethereum", "bitcoin", "solana", "tempo", "cosmos"];
  return familyOrder.flatMap((familyId) => {
    const family = grouped.get(familyId);
    return family ? [family] : [];
  });
}

function WalletHeader({
  title,
  walletLabel,
  onChangeWallet,
}: Pick<WalletHubProps, "title" | "walletLabel" | "onChangeWallet">) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Type as="h1" variant="display">{title ?? copy.title}</Type>
        <Type as="div" variant="body" className="text-muted-foreground">{walletLabel ?? copy.evmWallet}</Type>
      </div>
      {onChangeWallet ? (
        <Button className="self-start" onClick={onChangeWallet} variant="secondary">
          {copy.changeWallet}
        </Button>
      ) : null}
    </div>
  );
}

function formatUsdValue(token: WalletHubToken) {
  if (token.fiatValue) return token.fiatValue;
  if (!token.balance || typeof token.usdPrice !== "number") return null;
  const balance = Number.parseFloat(token.balance.replace(/,/g, ""));
  if (!Number.isFinite(balance)) return null;
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(balance * token.usdPrice);
}

const TOKEN_ORDER_BY_SYMBOL: Record<string, number> = {
  ETH: 0,
  IP: 1,
  WIP: 2,
  PATHUSD: 3,
  USDC: 4,
  USDT: 5,
  DAI: 6,
  WBTC: 7,
  BTC: 8,
  SOL: 9,
  LINK: 10,
};

function sortWalletAssets(assets: WalletFamily["assets"]) {
  return [...assets].sort((a, b) => {
    const aOrder = TOKEN_ORDER_BY_SYMBOL[a.symbol.toUpperCase()] ?? 100;
    const bOrder = TOKEN_ORDER_BY_SYMBOL[b.symbol.toUpperCase()] ?? 100;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.symbol.localeCompare(b.symbol);
  });
}

function TokenRow({
  chainId,
  token,
}: {
  chainId: WalletHubChainId;
  token: WalletHubToken;
}) {
  const fiatValue = formatUsdValue(token);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,11rem)_minmax(7rem,10rem)] items-center gap-4 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <TokenChainIcon chainId={chainId} token={token} />
        <div className="min-w-0">
          <Type as="div" variant="label" className="truncate ">{token.symbol}</Type>
        </div>
      </div>
      <Type as="div" variant="body" className="truncate text-left text-muted-foreground">
        {token.balance ? `${token.balance} ${token.symbol}` : token.symbol}
      </Type>
      <Type as="div" variant="body" className="truncate text-right text-foreground">{fiatValue ?? ""}</Type>
    </div>
  );
}

function NetworkCard({
  active,
  family,
  onSelect,
}: {
  active: boolean;
  family: WalletFamily;
  onSelect: (familyId: WalletFamilyId) => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-56 flex-col items-center justify-between gap-4 rounded-[var(--radius-xl)] border bg-card p-4 text-center transition-colors sm:p-5",
        active
          ? "border-primary bg-primary-subtle"
          : "border-border hover:border-border-soft hover:bg-muted/18",
      )}
      onClick={() => onSelect(family.id)}
      type="button"
    >
      <div className="space-y-4">
        <div className="flex min-h-14 items-center justify-center">
          <ChainIcon
            chainId={getWalletFamilyChainIcon(family.id)}
            className="size-20 border border-border-soft"
          />
        </div>
        <Type as="div" variant="h4">{family.title}</Type>
      </div>
      {family.address ? (
        <CopyField
          className="h-12 w-full px-4 pe-2"
          onClick={(event) => event.stopPropagation()}
          value={family.address}
        />
      ) : null}
    </button>
  );
}

export function WalletHub({
  title,
  walletLabel,
  walletAddress,
  onChangeWallet,
  chainSections,
}: WalletHubProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  const walletFamilies = React.useMemo(() => buildWalletFamilies({ chainSections, walletAddress }), [chainSections, walletAddress]);
  const [selectedFamilyId, setSelectedFamilyId] = React.useState<WalletFamilyId | null>(walletFamilies[0]?.id ?? null);
  const selectedFamily = walletFamilies.find((family) => family.id === selectedFamilyId) ?? walletFamilies[0] ?? null;
  const selectedAssets = React.useMemo(() => sortWalletAssets(selectedFamily?.assets ?? []), [selectedFamily?.assets]);

  React.useEffect(() => {
    if (!walletFamilies.some((family) => family.id === selectedFamilyId)) {
      setSelectedFamilyId(walletFamilies[0]?.id ?? null);
    }
  }, [selectedFamilyId, walletFamilies]);

  return (
    <div className="mx-auto flex w-full max-w-[86rem] flex-col gap-6 py-0">
      <WalletHeader onChangeWallet={onChangeWallet} title={title} walletLabel={walletLabel} />

      {walletFamilies.length > 0 ? (
        <>
          <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {walletFamilies.map((family) => (
                <NetworkCard
                  active={family.id === selectedFamily?.id}
                  family={family}
                  key={family.id}
                  onSelect={setSelectedFamilyId}
                />
              ))}
            </div>
          </section>

          <section>
            <Card className="overflow-hidden border-border bg-card shadow-none">
              {selectedAssets.length ? (
                <div className="divide-y divide-border-soft">
                  {selectedAssets.map((token) => (
                    <TokenRow
                      chainId={token.chainId}
                      key={`${token.chainId}:${token.id}`}
                      token={token}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-base text-muted-foreground sm:px-6">
                  <Type as="div" variant="body" className="text-muted-foreground">No assets yet.</Type>
                </div>
              )}
            </Card>
          </section>
        </>
      ) : (
        <Card className="border-border bg-card px-5 py-10 text-muted-foreground shadow-none sm:px-6">
          {walletAddress ? <CopyField value={walletAddress} /> : copy.noWalletConnected}
        </Card>
      )}
    </div>
  );
}
