/** @jsxImportSource @solidjs/web */

import { BadgedCircle, Type } from "../../design-system";
import type { WalletHubChainId, WalletHubToken } from "./wallet-hub.types";

const chainWords: Record<WalletHubChainId, string> = {
  ethereum: "ETH",
  base: "BASE",
  optimism: "OP",
  story: "IP",
  tempo: "T",
  solana: "SOL",
  bitcoin: "BTC",
  cosmos: "ATOM",
};

const chainColors: Record<WalletHubChainId, string> = {
  ethereum: "#627eea",
  base: "#0052ff",
  optimism: "#ff0420",
  story: "#7c3aed",
  tempo: "#0f766e",
  solana: "#14b8a6",
  bitcoin: "#f7931a",
  cosmos: "#6d4aff",
};

const tokenColors: Record<string, string> = {
  ATOM: "#6d4aff",
  BTC: "#f7931a",
  DAI: "#f5ac37",
  ETH: "#627eea",
  IP: "#7c3aed",
  LINK: "#2a5ada",
  P2P: "#334155",
  SOL: "#14b8a6",
  USDC: "#2775ca",
  USDT: "#26a17b",
  WBTC: "#f7931a",
  WIP: "#7c3aed",
};

function VisualMark(props: { color: string; label: string; class?: string }) {
  return (
    <svg aria-hidden="true" class={props.class ?? "size-full"} fill="none" viewBox="0 0 32 32">
      <circle cx="16" cy="16" fill={props.color} r="16" />
      <text
        dominant-baseline="central"
        fill="#ffffff"
        font-family="system-ui, sans-serif"
        font-size={props.label.length > 3 ? "7" : "9"}
        font-weight="700"
        text-anchor="middle"
        x="16"
        y="16"
      >
        {props.label}
      </text>
    </svg>
  );
}

function WalletIconFallback(props: { label: string }) {
  return (
    <span class="grid size-full place-items-center bg-secondary">
      <Type as="span" variant="label">{props.label.slice(0, 1).toUpperCase()}</Type>
    </span>
  );
}

export function ChainIcon(props: {
  chainId: WalletHubChainId;
  class?: string;
  framed?: boolean;
}) {
  const content = () => <VisualMark class="size-[74%]" color={chainColors[props.chainId]} label={chainWords[props.chainId]} />;
  if (props.framed === false) {
    return <span class={`grid shrink-0 place-items-center ${props.class ?? ""}`}>{content()}</span>;
  }
  return (
    <span class={`grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white ${props.class ?? ""}`}>
      {content()}
    </span>
  );
}

export function TokenChainIcon(props: {
  chainId: WalletHubChainId;
  chainLabel?: string;
  showChainBadge?: boolean;
  token: Pick<WalletHubToken, "name" | "symbol">;
  size?: "sm" | "md";
}) {
  const symbol = props.token.symbol.toUpperCase();
  const tokenColor = tokenColors[symbol] ?? "#64748b";
  const isSmall = props.size === "sm";
  const icon = (
    <span class={`grid place-items-center overflow-hidden rounded-full border border-border ${isSmall ? "size-10" : "size-12"} ${tokenColors[symbol] ? "bg-white p-1" : "bg-secondary"}`}>
      {tokenColors[symbol]
        ? <VisualMark class={isSmall ? "size-7" : "size-8"} color={tokenColor} label={symbol.slice(0, 4)} />
        : <WalletIconFallback label={symbol} />}
    </span>
  );
  if (!props.showChainBadge) return icon;
  return (
    <BadgedCircle
      badge={<ChainIcon chainId={props.chainId} class="size-4" framed={false} />}
      badgeLabel={props.chainLabel ? `${props.chainLabel} chain` : undefined}
      badgeFrameClassName="border border-white/70"
      badgePadding={2}
      badgeSize={isSmall ? 16 : 18}
      class={isSmall ? "size-10" : "size-12"}
    >
      {icon}
    </BadgedCircle>
  );
}
