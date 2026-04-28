"use client";

import {
  NetworkBase,
  NetworkBitcoin,
  NetworkEthereum,
  NetworkOptimism,
  NetworkTempo,
  TokenBTC,
  TokenDAI,
  TokenETH,
  TokenLINK,
  TokenSOL,
  TokenUSDC,
  TokenUSDT,
  type IconComponent,
} from "@web3icons/react";

import { BadgedCircle } from "@/components/primitives/badged-circle";
import cosmosIconUrl from "@/assets/wallet-icons/cosmos.png";
import ipIconUrl from "@/assets/wallet-icons/ip.png";
import sentinelIconUrl from "@/assets/wallet-icons/sentinel.png";
import solanaIconUrl from "@/assets/wallet-icons/solana.png";
import storyIconUrl from "@/assets/wallet-icons/story.png";
import { cn } from "@/lib/utils";

import type { WalletHubChainId, WalletHubToken } from "./wallet-hub.types";

const TOKEN_ICON_BY_SYMBOL: Partial<Record<string, IconComponent>> = {
  BTC: TokenBTC,
  DAI: TokenDAI,
  ETH: TokenETH,
  LINK: TokenLINK,
  SOL: TokenSOL,
  USDC: TokenUSDC,
  USDT: TokenUSDT,
  WBTC: TokenBTC,
  WETH: TokenETH,
};

const CHAIN_ICON_BY_CHAIN_ID: Partial<Record<WalletHubChainId, IconComponent>> = {
  base: NetworkBase,
  bitcoin: NetworkBitcoin,
  ethereum: NetworkEthereum,
  optimism: NetworkOptimism,
  tempo: NetworkTempo,
};

const LOCAL_TOKEN_ICON_BY_SYMBOL: Partial<Record<string, string>> = {
  ATOM: cosmosIconUrl,
  IP: ipIconUrl,
  P2P: sentinelIconUrl,
  WIP: ipIconUrl,
};

const LOCAL_CHAIN_ICON_BY_CHAIN_ID: Partial<Record<WalletHubChainId, string>> = {
  cosmos: cosmosIconUrl,
  solana: solanaIconUrl,
  story: storyIconUrl,
};

function LocalIcon({
  className,
  invert = false,
  src,
}: {
  className?: string;
  invert?: boolean;
  src: string;
}) {
  return (
    <img
      alt=""
      className={cn("block size-full object-contain", invert && "invert", className)}
      draggable={false}
      src={src}
    />
  );
}

export function WalletIconFallback({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("grid size-full place-items-center bg-muted text-base font-semibold text-foreground", className)}>
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ChainIcon({
  chainId,
  className,
  framed = true,
}: {
  chainId: WalletHubChainId;
  className?: string;
  framed?: boolean;
}) {
  const ChainIconComponent = CHAIN_ICON_BY_CHAIN_ID[chainId];
  const localChainIcon = LOCAL_CHAIN_ICON_BY_CHAIN_ID[chainId];
  const content = (
    <>
      {localChainIcon ? (
        <LocalIcon
          className={framed ? "size-[74%]" : "size-full"}
          src={localChainIcon}
        />
      ) : null}
      {!localChainIcon && chainId !== "story" && ChainIconComponent ? (
        <ChainIconComponent
          aria-hidden="true"
          className={framed ? "size-[72%]" : "size-full"}
          variant="branded"
        />
      ) : null}
      {!localChainIcon && chainId !== "story" && !ChainIconComponent ? <WalletIconFallback label={chainId} /> : null}
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
    <div className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white", className)}>
      {content}
    </div>
  );
}

export function TokenChainIcon({
  chainId,
  chainLabel,
  showChainBadge = false,
  token,
  size = "md",
}: {
  chainId: WalletHubChainId;
  chainLabel?: string;
  showChainBadge?: boolean;
  token: Pick<WalletHubToken, "name" | "symbol">;
  size?: "sm" | "md";
}) {
  const symbol = token.symbol.toUpperCase();
  const localTokenIcon = LOCAL_TOKEN_ICON_BY_SYMBOL[symbol];
  const TokenIconComponent = TOKEN_ICON_BY_SYMBOL[symbol];

  const isFallback = !localTokenIcon && !TokenIconComponent;

  const config = size === "sm"
    ? {
        circle: "size-10",
        inner: "size-10",
        pad: isFallback ? "p-0" : "p-1",
        badgeSize: 16,
        badgePadding: 2,
        badgeIcon: "size-4",
        tokenIcon: "size-7",
      }
    : {
        circle: "size-12",
        inner: "size-12",
        pad: isFallback ? "p-0" : "p-1.5",
        badgeSize: 18,
        badgePadding: 3,
        badgeIcon: "size-4.5",
        tokenIcon: "size-8",
      };

  const tokenIcon = (
    <div className={cn(
      "grid place-items-center overflow-hidden rounded-full border border-border [&_svg]:block",
      config.inner,
      config.pad,
      isFallback ? "bg-secondary" : "bg-white",
    )}>
      {localTokenIcon ? <LocalIcon className={config.tokenIcon} src={localTokenIcon} /> : null}
      {!localTokenIcon && TokenIconComponent ? (
        <TokenIconComponent aria-hidden="true" className={config.tokenIcon} variant="branded" />
      ) : null}
      {!localTokenIcon && !TokenIconComponent ? (
        <WalletIconFallback label={symbol} />
      ) : null}
    </div>
  );

  if (!showChainBadge) {
    return tokenIcon;
  }

  return (
    <BadgedCircle
      badge={<ChainIcon chainId={chainId} className={config.badgeIcon} framed={false} />}
      badgeLabel={chainLabel ? `${chainLabel} chain` : undefined}
      badgeFrameClassName="border border-white/70"
      badgePadding={config.badgePadding}
      badgeSize={config.badgeSize}
      className={config.circle}
    >
      {tokenIcon}
    </BadgedCircle>
  );
}
