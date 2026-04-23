"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react";
import {
  NetworkBase,
  NetworkBitcoin,
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
import { Input } from "@/components/primitives/input";
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
  ethereum: NetworkEthereum,
  solana: NetworkSolana,
  tempo: NetworkTempo,
};

function CopyAddressField({ value }: { value: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={copy.walletAddressLabel}
        className="font-mono text-base tracking-[0.01em]"
        readOnly
        value={value}
      />
      <Button
        aria-label={copied ? copy.copied : copy.copyAddress}
        onClick={handleCopy}
        size="icon"
        variant="secondary"
      >
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
      </Button>
    </div>
  );
}

function WalletHeaderCard({
  walletAddress,
  walletLabel,
  onChangeWallet,
}: Pick<WalletHubProps, "walletAddress" | "walletLabel" | "onChangeWallet">) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  const hasWallet = Boolean(walletAddress);
  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <div className="border-b border-border-soft bg-muted/25 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
            <div className="text-base text-muted-foreground">{walletLabel ?? copy.evmWallet}</div>
          </div>
          {onChangeWallet ? (
            <Button onClick={onChangeWallet} variant="secondary">
              {copy.changeWallet}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {hasWallet ? (
          <CopyAddressField value={walletAddress as string} />
        ) : (
          <div className="text-lg font-semibold text-foreground">{copy.noWalletConnected}</div>
        )}
      </div>
    </Card>
  );
}

function StoryProtocolLogo({ className }: { className?: string }) {
  return (
    <img
      alt=""
      className={cn("size-full object-cover", className)}
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
      <div className="grid size-12 place-items-center overflow-hidden rounded-full border border-border bg-background">
        {isStoryAsset ? <StoryProtocolLogo /> : null}
        {!isStoryAsset && TokenIconComponent ? (
          <TokenIconComponent aria-hidden="true" className="size-9" variant="branded" />
        ) : null}
        {!isStoryAsset && !TokenIconComponent ? <SymbolFallback label={symbol} /> : null}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center overflow-hidden rounded-full border-2 border-card bg-background">
        <ChainIcon chainId={chainId} className="size-full" />
      </div>
    </div>
  );
}

function TokenRow({ chainId, token }: { chainId: WalletHubChainId; token: WalletHubToken }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <TokenIcon chainId={chainId} token={token} />
        <div className="min-w-0">
          <div className="truncate text-base font-medium text-foreground">{token.symbol}</div>
          <div className="truncate text-base text-muted-foreground">{token.name}</div>
        </div>
      </div>
      <div className="shrink-0 text-base text-foreground">{token.balance}</div>
    </div>
  );
}

function ChainSectionCard({ section }: { section: WalletHubChainSection }) {
  return (
    <Card className="border-border bg-card shadow-none">
      <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <ChainIcon chainId={section.chainId} />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
          </div>
        </div>

        <div className="divide-y divide-border">
          {section.tokens.map((token) => (
            <TokenRow chainId={section.chainId} key={token.id} token={token} />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function WalletHub({
  title,
  walletLabel,
  walletAddress,
  onChangeWallet,
  chainSections,
}: WalletHubProps) {
  const visibleChainSections = chainSections.filter((section) => section.tokens.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-5 py-0">
      {title ? (
        <div className="text-base font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <WalletHeaderCard
          onChangeWallet={onChangeWallet}
          walletAddress={walletAddress}
          walletLabel={walletLabel}
        />

        {visibleChainSections.length > 0 ? (
          <div className="space-y-4">
            {visibleChainSections.map((section) => (
              <ChainSectionCard key={section.chainId} section={section} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChainIcon({
  chainId,
  className,
}: {
  chainId: WalletHubChainId;
  className?: string;
}) {
  const ChainIconComponent = CHAIN_ICON_BY_CHAIN_ID[chainId];

  return (
    <div className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-background", className)}>
      {chainId === "story" ? <StoryProtocolLogo /> : null}
      {chainId !== "story" && ChainIconComponent ? (
        <ChainIconComponent aria-hidden="true" className="size-full" variant="branded" />
      ) : null}
      {chainId !== "story" && !ChainIconComponent ? <SymbolFallback label={chainId} /> : null}
    </div>
  );
}
