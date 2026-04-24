"use client";

import * as React from "react";
import { CaretRight, Check, Copy } from "@phosphor-icons/react";

import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { CopyField } from "@/components/primitives/copy-field";
import { PageContainer } from "@/components/primitives/layout-shell";
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
  assets: Array<WalletHubToken & { chainId: WalletHubChainId; chainTitle: string }>;
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

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
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

function formatUsdValue(token: WalletHubToken) {
  if (token.fiatValue) return token.fiatValue;
  if (!token.balance || typeof token.usdPrice !== "number") return null;
  const balance = Number.parseFloat(token.balance.replace(/,/g, ""));
  if (!Number.isFinite(balance)) return null;
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(balance * token.usdPrice);
}

function parseUsdValue(value: string | null): number {
  if (!value) return 0;
  const numeric = Number.parseFloat(value.replace(/[$,]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatFamilyTotal(assets: WalletFamily["assets"]) {
  const total = assets.reduce((sum, token) => sum + parseUsdValue(formatUsdValue(token)), 0);
  if (total === 0) return "$0.00";
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(total);
}

function formatAssetSubtitle(token: WalletHubToken & { chainTitle?: string }) {
  return token.chainTitle ? `${token.name} on ${token.chainTitle}` : token.name;
}

const TOKEN_ORDER_BY_SYMBOL: Record<string, number> = {
  ETH: 0,
  USDC: 1,
  USDT: 2,
  DAI: 3,
  WBTC: 4,
  LINK: 5,
  IP: 6,
  WIP: 7,
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

function sortWalletAssets(assets: WalletFamily["assets"]) {
  return [...assets].sort((a, b) => {
    const aChainOrder = CHAIN_ORDER_BY_ID[a.chainId] ?? 100;
    const bChainOrder = CHAIN_ORDER_BY_ID[b.chainId] ?? 100;
    if (aChainOrder !== bChainOrder) return aChainOrder - bChainOrder;
    const aOrder = TOKEN_ORDER_BY_SYMBOL[a.symbol.toUpperCase()] ?? 100;
    const bOrder = TOKEN_ORDER_BY_SYMBOL[b.symbol.toUpperCase()] ?? 100;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.symbol.localeCompare(b.symbol);
  });
}

function CopyAddressButton({
  address,
  className,
}: {
  address: string | null;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [address]);

  if (!address) return null;

  return (
    <button
      aria-label={copied ? "Copied" : "Copy address"}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-soft",
        className,
      )}
      onClick={handleCopy}
      type="button"
    >
      {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
    </button>
  );
}

function DesktopTokenRow({
  chainId,
  token,
}: {
  chainId: WalletHubChainId;
  token: WalletHubToken & { chainTitle?: string };
}) {
  const fiatValue = formatUsdValue(token);

  return (
    <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_minmax(10rem,auto)_minmax(8rem,auto)] items-center gap-6 border-b border-border px-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-4">
        <TokenChainIcon chainId={chainId} token={token} size="sm" />
        <div className="min-w-0">
          <Type as="div" variant="h4" className="truncate text-xl leading-6">{token.symbol}</Type>
          <Type as="div" variant="body" className="truncate leading-6 text-muted-foreground">
            {formatAssetSubtitle(token)}
          </Type>
        </div>
      </div>
      <Type as="div" variant="body" className="text-right text-lg leading-6 text-foreground">
        {token.balance ? `${token.balance} ${token.symbol}` : token.symbol}
      </Type>
      <Type as="div" variant="body" className="text-right text-lg leading-6 text-foreground">{fiatValue ?? "$0.00"}</Type>
    </div>
  );
}

function MobileTokenRow({
  chainId,
  token,
}: {
  chainId: WalletHubChainId;
  token: WalletHubToken & { chainTitle?: string };
}) {
  const fiatValue = formatUsdValue(token);

  return (
    <div className="flex min-h-[56px] items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <TokenChainIcon chainId={chainId} token={token} size="sm" />
        <div className="min-w-0">
          <Type as="div" variant="label" className="truncate leading-6">{token.symbol}</Type>
          <Type as="div" variant="caption" className="truncate text-base leading-5">
            {formatAssetSubtitle(token)}
          </Type>
        </div>
      </div>
      <div className="min-w-0 shrink-0 text-right">
        <Type as="div" variant="body" className="truncate leading-6 text-foreground">
          {token.balance ? `${token.balance} ${token.symbol}` : `0 ${token.symbol}`}
        </Type>
        <Type as="div" variant="caption" className="truncate text-base leading-5">
          {fiatValue ?? "$0.00"}
        </Type>
      </div>
    </div>
  );
}

function MobileChainHeader({
  family,
  totalValue,
}: {
  family: WalletFamily;
  totalValue: string | null;
}) {
  return (
    <div className={cn(
      "grid min-h-[56px] grid-cols-[2.5rem_minmax(0,1fr)_2rem_minmax(5.5rem,auto)] items-center gap-x-3",
      !totalValue && "grid-cols-[2.5rem_minmax(0,1fr)_2rem]",
    )}>
      <ChainIcon
        chainId={getWalletFamilyChainIcon(family.id)}
        className="size-10 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Type as="div" variant="h4" className="truncate text-xl leading-6">{family.title}</Type>
        {family.address ? (
          <Type as="div" variant="body" className="truncate font-mono leading-6 text-muted-foreground">
            {truncateAddress(family.address)}
          </Type>
        ) : null}
      </div>
      <CopyAddressButton address={family.address} className="size-7 justify-self-center" />
      {totalValue ? (
        <Type as="div" variant="body" className="min-w-0 shrink-0 text-right text-lg font-semibold leading-6 text-foreground">
          {totalValue}
        </Type>
      ) : null}
    </div>
  );
}

function MobileChainSection({
  family,
}: {
  family: WalletFamily;
}) {
  const sortedAssets = React.useMemo(() => sortWalletAssets(family.assets), [family.assets]);
  const visibleAssets = family.id === "ethereum" ? sortedAssets.slice(0, 4) : [];
  const hiddenAssetCount = family.id === "ethereum" ? Math.max(0, sortedAssets.length - visibleAssets.length) : 0;
  const totalValue = family.id === "ethereum" ? null : formatFamilyTotal(family.assets);

  return (
    <section className="border-b border-border px-5 py-3 last:border-b-0">
      <MobileChainHeader family={family} totalValue={totalValue} />
      {visibleAssets.length > 0 ? (
        <div className="pt-2">
          {visibleAssets.map((token) => (
            <MobileTokenRow
              chainId={token.chainId}
              key={`${token.chainId}:${token.id}`}
              token={token}
            />
          ))}
        </div>
      ) : null}
      {hiddenAssetCount > 0 ? (
        <div className="py-2 text-center">
          <Type as="div" variant="body" className="leading-6 text-destructive">
            +{hiddenAssetCount} more tokens
          </Type>
        </div>
      ) : null}
    </section>
  );
}

function DesktopWalletCard({
  family,
  selected,
  onSelect,
}: {
  family: WalletFamily;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[224px] min-w-0 cursor-pointer flex-col items-center justify-end rounded-2xl border bg-card p-4 text-center transition-[background-color,border-color,box-shadow] hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-soft",
        selected ? "border-foreground/40 bg-muted/20" : "border-border",
      )}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <ChainIcon
        chainId={getWalletFamilyChainIcon(family.id)}
        className="mb-5 size-20"
      />
      <Type as="div" variant="h4" className="mb-4 truncate text-xl leading-6">
        {family.title}
      </Type>
      <div className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-full border border-border bg-background px-4">
        <Type as="div" variant="body" className="min-w-0 truncate font-mono leading-6 text-foreground">
          {family.address ? truncateAddress(family.address) : "No address"}
        </Type>
        <CopyAddressButton address={family.address} className="-mr-2 size-7 [&_svg]:size-4" />
      </div>
    </div>
  );
}

function DesktopAssetPanel({
  assets,
}: {
  assets: WalletFamily["assets"];
}) {
  const sortedAssets = React.useMemo(() => sortWalletAssets(assets), [assets]);
  const visibleAssets = sortedAssets.slice(0, 6);
  const hiddenAssetCount = Math.max(0, sortedAssets.length - visibleAssets.length);

  return (
    <Card className="rounded-2xl border-border bg-card px-5 py-4 shadow-none">
      <div>
        {visibleAssets.map((token) => (
          <DesktopTokenRow
            chainId={token.chainId}
            key={`${token.chainId}:${token.id}`}
            token={token}
          />
        ))}
      </div>
      {hiddenAssetCount > 0 ? (
        <div className="flex min-h-[52px] items-center justify-between gap-4 px-3 pt-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex shrink-0 items-center">
              {visibleAssets.slice(0, 5).map((token, index) => (
                <span className={cn("relative rounded-full", index > 0 && "-ml-2")} key={`${token.chainId}:${token.id}`}>
                  <TokenChainIcon chainId={token.chainId} token={token} size="sm" />
                </span>
              ))}
              <span className="-ml-2 grid h-9 min-w-9 place-items-center rounded-full border border-border bg-background px-2 text-base font-semibold text-foreground">
                +{hiddenAssetCount}
              </span>
            </div>
            <Type as="div" variant="body" className="text-muted-foreground">
              {hiddenAssetCount} more assets
            </Type>
          </div>
          <CaretRight className="size-6 shrink-0 text-foreground" />
        </div>
      ) : null}
    </Card>
  );
}

function DesktopWalletHub({
  title,
  walletLabel,
  walletFamilies,
}: {
  title?: string;
  walletLabel?: string;
  walletFamilies: WalletFamily[];
}) {
  const [selectedFamilyId, setSelectedFamilyId] = React.useState<WalletFamilyId>(
    walletFamilies[0]?.id ?? "ethereum",
  );
  const selectedFamily = walletFamilies.find((family) => family.id === selectedFamilyId) ?? walletFamilies[0];

  React.useEffect(() => {
    if (!walletFamilies.some((family) => family.id === selectedFamilyId)) {
      setSelectedFamilyId(walletFamilies[0]?.id ?? "ethereum");
    }
  }, [selectedFamilyId, walletFamilies]);

  return (
    <PageContainer className="hidden py-8 md:block" size="rail">
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
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {walletFamilies.map((family) => (
          <DesktopWalletCard
            family={family}
            key={family.id}
            onSelect={() => setSelectedFamilyId(family.id)}
            selected={selectedFamily.id === family.id}
          />
        ))}
      </div>
      <DesktopAssetPanel assets={selectedFamily.assets} />
    </PageContainer>
  );
}

function MobileWalletHub({
  walletFamilies,
}: {
  walletFamilies: WalletFamily[];
}) {
  return (
    <div className="-mx-3 flex w-[calc(100%+1.5rem)] max-w-none flex-col bg-background md:hidden">
      {walletFamilies.map((family) => (
        <MobileChainSection family={family} key={family.id} />
      ))}
    </div>
  );
}

export function WalletHub({
  title,
  walletLabel,
  walletAddress,
  chainSections,
}: WalletHubProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  const walletFamilies = React.useMemo(() => buildWalletFamilies({ chainSections, walletAddress }), [chainSections, walletAddress]);

  if (walletFamilies.length === 0) {
    return (
      <PageContainer>
        <Card className="border-border bg-card px-5 py-10 text-muted-foreground shadow-none sm:px-6">
          {walletAddress ? <CopyField value={walletAddress} /> : copy.noWalletConnected}
        </Card>
      </PageContainer>
    );
  }

  return (
    <>
      <DesktopWalletHub
        title={title ?? copy.title}
        walletFamilies={walletFamilies}
        walletLabel={walletLabel}
      />
      <MobileWalletHub walletFamilies={walletFamilies} />
    </>
  );
}
