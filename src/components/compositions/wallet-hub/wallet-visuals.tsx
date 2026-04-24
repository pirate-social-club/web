"use client";

import {
  NetworkBase,
  NetworkBitcoin,
  NetworkEthereum,
  NetworkOptimism,
  NetworkSolana,
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
  solana: NetworkSolana,
  tempo: NetworkTempo,
};

const LOCAL_TOKEN_ICON_BY_SYMBOL: Partial<Record<string, string>> = {
  IP: ipIconUrl,
  P2P: sentinelIconUrl,
  WIP: ipIconUrl,
};

const LOCAL_CHAIN_ICON_BY_CHAIN_ID: Partial<Record<WalletHubChainId, string>> = {
  cosmos: cosmosIconUrl,
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
      className={cn("size-full object-contain", invert && "invert", className)}
      draggable={false}
      src={src}
    />
  );
}

export function WalletIconFallback({ label }: { label: string }) {
  return (
    <div className="grid size-full place-items-center bg-muted text-base font-semibold text-foreground">
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
      {localChainIcon && chainId === "cosmos" ? (
        <span className={cn("relative overflow-hidden", framed ? "size-11" : "size-full")}>
          <LocalIcon
            className={cn(framed ? "absolute left-1/2 top-0 size-10 -translate-x-1/2" : "size-full")}
            src={localChainIcon}
          />
        </span>
      ) : null}
      {localChainIcon && chainId !== "cosmos" ? (
        <LocalIcon
          className={framed ? "size-[72%]" : "size-full"}
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
  token,
}: {
  chainId: WalletHubChainId;
  token: Pick<WalletHubToken, "name" | "symbol">;
}) {
  const symbol = token.symbol.toUpperCase();
  const localTokenIcon = LOCAL_TOKEN_ICON_BY_SYMBOL[symbol];
  const TokenIconComponent = TOKEN_ICON_BY_SYMBOL[symbol];
  const isStoryAsset = chainId === "story" || symbol === "IP" || symbol === "WIP";

  return (
    <BadgedCircle
      badge={<ChainIcon chainId={chainId} className="size-4.5" framed={false} />}
      badgeFrameClassName="border border-white/70"
      badgePadding={3}
      badgeSize={18}
      className="size-12"
    >
      <div className="grid size-12 place-items-center overflow-hidden rounded-full border border-border bg-white p-1.5">
        {localTokenIcon ? <LocalIcon className={isStoryAsset ? "size-8" : "size-9"} src={localTokenIcon} /> : null}
        {!localTokenIcon && TokenIconComponent ? (
          <TokenIconComponent aria-hidden="true" className="size-9" variant="branded" />
        ) : null}
        {!localTokenIcon && !TokenIconComponent ? <WalletIconFallback label={symbol} /> : null}
      </div>
    </BadgedCircle>
  );
}
