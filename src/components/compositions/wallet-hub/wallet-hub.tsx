"use client";

import * as React from "react";
import {
  NetworkBase,
  NetworkBitcoin,
  NetworkCosmosHub,
  NetworkEthereum,
  NetworkSolana,
  NetworkTempo,
  TokenBTC,
  TokenETH,
  TokenSOL,
  TokenUSDC,
  type IconComponent,
} from "@web3icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import storyProtocolLogoUrl from "@/assets/story-protocol-logo.jpg";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

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

const TOKEN_ICON_BY_SYMBOL: Partial<Record<string, IconComponent>> = {
  BTC: TokenBTC,
  ETH: TokenETH,
  SOL: TokenSOL,
  USDC: TokenUSDC,
  WETH: TokenETH,
};

const CHAIN_ICON_BY_CHAIN_ID: Partial<Record<WalletHubChainId, IconComponent>> = {
  base: NetworkBase,
  bitcoin: NetworkBitcoin,
  cosmos: NetworkCosmosHub,
  ethereum: NetworkEthereum,
  solana: NetworkSolana,
  tempo: NetworkTempo,
};

function getWalletFamilyId(chainId: WalletHubChainId): WalletFamilyId {
  if (chainId === "ethereum" || chainId === "base" || chainId === "story") {
    return "ethereum";
  }

  return chainId;
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
        address: walletAddress ?? null,
        assets: section.tokens.map((token) => ({
          ...token,
          chainId: section.chainId,
        })),
      });
      continue;
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
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{title ?? copy.title}</h1>
        <div className="text-base text-muted-foreground">{walletLabel ?? copy.evmWallet}</div>
      </div>
      {onChangeWallet ? (
        <Button className="self-start" onClick={onChangeWallet} variant="secondary">
          {copy.changeWallet}
        </Button>
      ) : null}
    </div>
  );
}

function StoryProtocolLogo({ className }: { className?: string }) {
  return (
    <img
      alt=""
      className={cn("size-full object-contain", className)}
      draggable={false}
      src={storyProtocolLogoUrl}
    />
  );
}

function SymbolFallback({ label }: { label: string }) {
  return (
    <div className="grid size-full place-items-center bg-muted text-base font-semibold text-foreground">
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

function TokenIcon({ chainId, token }: { chainId: WalletHubChainId; token: WalletHubToken }) {
  const symbol = token.symbol.toUpperCase();
  const TokenIconComponent = TOKEN_ICON_BY_SYMBOL[symbol];
  const isStoryAsset = chainId === "story" || symbol === "IP" || symbol === "WIP";

  return (
    <div className="relative size-12 shrink-0">
      <div className="grid size-12 place-items-center overflow-hidden rounded-full border border-border bg-background p-1.5">
        {isStoryAsset ? <StoryProtocolLogo className="size-9" /> : null}
        {!isStoryAsset && TokenIconComponent ? (
          <TokenIconComponent aria-hidden="true" className="size-9" variant="branded" />
        ) : null}
        {!isStoryAsset && !TokenIconComponent ? <SymbolFallback label={symbol} /> : null}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center overflow-hidden rounded-full border-2 border-card bg-background">
        <ChainIcon chainId={chainId} className="size-3.5" framed={false} />
      </div>
    </div>
  );
}

function TokenRow({
  chainId,
  token,
}: {
  chainId: WalletHubChainId;
  token: WalletHubToken;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <TokenIcon chainId={chainId} token={token} />
        <div className="min-w-0">
          <div className="truncate text-base font-medium text-foreground">{token.symbol}</div>
          <div className="truncate text-base text-muted-foreground">{token.name}</div>
        </div>
      </div>
      <div className="shrink-0 text-base font-medium text-foreground">{token.balance}</div>
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
        "flex min-h-44 flex-col justify-between rounded-[var(--radius-xl)] border bg-card p-4 text-left transition-colors sm:p-5",
        active
          ? "border-primary bg-[color-mix(in_oklab,var(--primary)_8%,var(--card))]"
          : "border-border hover:border-border-soft hover:bg-muted/18",
      )}
      onClick={() => onSelect(family.id)}
      type="button"
    >
      <div className="space-y-5">
        <span className="sr-only">{family.title}</span>
        <div className="flex min-h-14 items-center justify-center">
          <ChainIcon chainId={getWalletFamilyChainIcon(family.id)} className="size-20" framed={false} />
        </div>
      </div>
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
            <div className="text-xl font-semibold text-foreground">Networks</div>
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
            {selectedFamily?.address ? <CopyField className="max-w-xl" value={selectedFamily.address} /> : null}
          </section>

          <section className="space-y-3">
            <div className="text-xl font-semibold text-foreground">Assets</div>

            <Card className="overflow-hidden border-border bg-card shadow-none">
              {selectedFamily?.assets.length ? (
                <div className="divide-y divide-border-soft">
                  {selectedFamily.assets.map((token) => (
                    <TokenRow
                      chainId={token.chainId}
                      key={`${token.chainId}:${token.id}`}
                      token={token}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-base text-muted-foreground sm:px-6">
                  No assets yet.
                </div>
              )}
            </Card>
          </section>
        </>
      ) : (
        <Card className="border-border bg-card px-5 py-10 text-base text-muted-foreground shadow-none sm:px-6">
          {walletAddress ? <CopyField value={walletAddress} /> : copy.noWalletConnected}
        </Card>
      )}
    </div>
  );
}

function ChainIcon({
  chainId,
  className,
  framed = true,
}: {
  chainId: WalletHubChainId;
  className?: string;
  framed?: boolean;
}) {
  const ChainIconComponent = CHAIN_ICON_BY_CHAIN_ID[chainId];
  const content = (
    <>
      {chainId === "story" ? <StoryProtocolLogo className={framed ? "size-[72%]" : "size-full"} /> : null}
      {chainId !== "story" && ChainIconComponent ? (
        <ChainIconComponent
          aria-hidden="true"
          className={framed ? "size-[72%]" : "size-full"}
          variant="branded"
        />
      ) : null}
      {chainId !== "story" && !ChainIconComponent ? <SymbolFallback label={chainId} /> : null}
    </>
  );

  if (!framed) {
    return (
      <div className={cn("grid shrink-0 place-items-center", className)}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-background", className)}>
      {content}
    </div>
  );
}
