"use client";

import type {
  CommunityHandlePaymentInstructions,
  CommunityPurchaseQuote,
  CommunityPurchaseQuoteRequest,
} from "@pirate/api-contracts";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  erc20Abi,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { getPirateNetworkConfig } from "@/lib/network-config";
import { readViteEnv } from "@/lib/vite-env";

const BASE_MAINNET_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const BASE_SEPOLIA_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
const TX_WAIT_TIMEOUT_MS = 90_000;

export type UsdcTransferInput = {
  chainId: number;
  tokenAddress: Address;
  recipientAddress: Address;
  amountAtomic: bigint;
};

function normalizeAddress(value: string | null | undefined): Address | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isAddress(trimmed) ? trimmed.toLowerCase() as Address : null;
}

function readChainIdEnv(name: string): number | null {
  const value = readViteEnv(name);
  if (!value) return null;
  const chainId = Number(value);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error(`${name} must be a positive chain id.`);
  }
  return chainId;
}

function resolveUsdcTokenAddress(chainId: number): Address {
  const explicit = normalizeAddress(readViteEnv("VITE_PIRATE_CHECKOUT_USDC_TOKEN_ADDRESS"));
  if (explicit) return explicit;
  if (chainId === base.id) return BASE_MAINNET_USDC;
  if (chainId === baseSepolia.id) return BASE_SEPOLIA_USDC;
  throw new Error(`USDC is not configured for chain ${chainId}.`);
}

function resolveCheckoutRouteChain(): { chainId: number; displayName: string } {
  const explicitChainId = readChainIdEnv("VITE_PIRATE_CHECKOUT_SOURCE_CHAIN_ID");
  if (explicitChainId === base.id) {
    return { chainId: base.id, displayName: "Base Mainnet" };
  }
  if (explicitChainId === baseSepolia.id) {
    return { chainId: baseSepolia.id, displayName: "Base Sepolia" };
  }
  if (explicitChainId) {
    throw new Error(`Unsupported checkout chain (${explicitChainId}).`);
  }

  const networkConfig = getPirateNetworkConfig();
  return {
    chainId: networkConfig.base.chainId,
    displayName: networkConfig.base.label,
  };
}

function resolveCheckoutChain(chainId: number) {
  const networkConfig = getPirateNetworkConfig();
  if (chainId === networkConfig.base.chainId) {
    return defineChain({
      id: networkConfig.base.chainId,
      name: networkConfig.base.label,
      nativeCurrency: {
        decimals: 18,
        name: "ETH",
        symbol: "ETH",
      },
      network: networkConfig.base.network,
      rpcUrls: {
        default: {
          http: [networkConfig.base.rpcUrl],
        },
        public: {
          http: [networkConfig.base.rpcUrl],
        },
      },
      blockExplorers: {
        default: {
          name: networkConfig.base.label,
          url: networkConfig.base.explorerUrl,
        },
      },
    });
  }

  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  throw new Error(`Unsupported checkout chain (${chainId}).`);
}

function resolveQuoteSourceChainId(quote: CommunityPurchaseQuote): number {
  if (quote.source_chain?.chain_namespace !== "eip155") {
    throw new Error("This quote requires an unsupported checkout chain.");
  }
  const chainId = quote.source_chain.chain_id;
  if (typeof chainId !== "number" || !Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error("This quote has an invalid checkout chain.");
  }
  return chainId;
}

function resolveUsdAmountAtomic(amountUsd: number): bigint {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("This quote has an invalid checkout amount.");
  }
  const amount = BigInt(Math.round(amountUsd * 1_000_000));
  if (amount <= 0n) {
    throw new Error("This quote is below USDC precision.");
  }
  return amount;
}

function requirePositiveAtomicAmount(value: string): bigint {
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    throw new Error("This checkout amount is invalid.");
  }
  const amount = BigInt(trimmed);
  if (amount <= 0n) {
    throw new Error("This checkout amount is below USDC precision.");
  }
  return amount;
}

function requireEip155ChainId(chain: CommunityHandlePaymentInstructions["chain"]): number {
  if (chain.chain_namespace !== "eip155") {
    throw new Error("This checkout requires an unsupported chain.");
  }
  if (typeof chain.chain_id !== "number" || !Number.isSafeInteger(chain.chain_id) || chain.chain_id <= 0) {
    throw new Error("This checkout has an invalid chain.");
  }
  return chain.chain_id;
}

const checkoutRouteChain = resolveCheckoutRouteChain();

export const DEFAULT_STORY_CHECKOUT_ROUTE: Pick<
  CommunityPurchaseQuoteRequest,
  "client_estimated_hop_count" | "client_estimated_slippage_bps" | "funding_asset" | "route_provider" | "source_chain"
> = {
  client_estimated_hop_count: 1,
  client_estimated_slippage_bps: 0,
  funding_asset: {
    asset_symbol: "USDC",
    chain_namespace: "eip155",
    chain_id: checkoutRouteChain.chainId,
    display_name: `USDC on ${checkoutRouteChain.displayName}`,
  },
  route_provider: "pirate_checkout",
  source_chain: {
    chain_namespace: "eip155",
    chain_id: checkoutRouteChain.chainId,
    display_name: checkoutRouteChain.displayName,
  },
};

export function findConnectedFundingWallet(params: {
  connectedWallets: PirateConnectedEvmWallet[];
  primaryWalletAddress?: string | null;
}): PirateConnectedEvmWallet | null {
  const primaryAddress = params.primaryWalletAddress?.trim().toLowerCase();
  if (primaryAddress) {
    return params.connectedWallets.find((candidate) =>
      candidate.address.toLowerCase() === primaryAddress
    ) ?? null;
  }

  return params.connectedWallets[0] ?? null;
}

export function resolveStoryCheckoutTransferInput(quote: CommunityPurchaseQuote): UsdcTransferInput {
  if (quote.route_provider !== "pirate_checkout") {
    throw new Error("This quote requires an unsupported checkout route.");
  }
  if (quote.funding_asset?.asset_symbol !== "USDC") {
    throw new Error("This quote requires USDC checkout.");
  }

  const chainId = resolveQuoteSourceChainId(quote);
  const recipientAddress = normalizeAddress(quote.funding_destination_address);
  if (!recipientAddress) {
    throw new Error("This quote is missing its checkout destination.");
  }

  return {
    chainId,
    tokenAddress: resolveUsdcTokenAddress(chainId),
    recipientAddress,
    amountAtomic: resolveUsdAmountAtomic(quote.final_price_cents / 100),
  };
}

export function resolveHandleCheckoutTransferInput(
  instructions: CommunityHandlePaymentInstructions,
): UsdcTransferInput {
  const chainId = requireEip155ChainId(instructions.chain);
  const tokenAddress = normalizeAddress(instructions.token_address);
  const recipientAddress = normalizeAddress(instructions.recipient_address);
  if (!tokenAddress) {
    throw new Error("This handle quote is missing its USDC token.");
  }
  if (!recipientAddress) {
    throw new Error("This handle quote is missing its checkout destination.");
  }

  return {
    chainId,
    tokenAddress,
    recipientAddress,
    amountAtomic: requirePositiveAtomicAmount(instructions.amount_atomic),
  };
}

export function resolveBookingCheckoutTransferInput(payment: {
  chain_id: number;
  token_address: string;
  recipient_address: string;
  amount_atomic: string;
}): UsdcTransferInput {
  const tokenAddress = normalizeAddress(payment.token_address);
  if (!tokenAddress) throw new Error("This booking quote has an invalid payment token.");
  const recipientAddress = normalizeAddress(payment.recipient_address);
  if (!recipientAddress) throw new Error("This booking quote is missing a valid payment destination.");
  let amountAtomic: bigint;
  try { amountAtomic = BigInt(payment.amount_atomic); } catch {
    throw new Error("This booking quote has an invalid payment amount.");
  }
  if (amountAtomic <= 0n) throw new Error("This booking quote has a zero or negative payment amount.");
  return { chainId: payment.chain_id, tokenAddress, recipientAddress, amountAtomic };
}

export async function executeUsdcTransfer(params: {
  transfer: UsdcTransferInput;
  wallet: PirateConnectedEvmWallet;
}): Promise<Hex> {
  const chainId = params.transfer.chainId;
  const chain = resolveCheckoutChain(chainId);
  const account = normalizeAddress(params.wallet.address);
  if (!account) {
    throw new Error("Connected wallet address is invalid.");
  }

  await params.wallet.switchChain(chainId);
  const provider = await params.wallet.getEthereumProvider();
  const walletClient = createWalletClient({
    account,
    chain,
    transport: custom(provider as never),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });

  const hash = await walletClient.writeContract({
    abi: erc20Abi,
    account,
    address: params.transfer.tokenAddress,
    args: [params.transfer.recipientAddress, params.transfer.amountAtomic],
    chain,
    functionName: "transfer",
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: TX_WAIT_TIMEOUT_MS,
  });
  if (receipt.status !== "success") {
    throw new Error("USDC checkout transaction reverted.");
  }

  return hash;
}

export async function executeRoutedStoryCheckout(params: {
  quote: CommunityPurchaseQuote;
  wallet: PirateConnectedEvmWallet;
}): Promise<Hex> {
  return executeUsdcTransfer({
    transfer: resolveStoryCheckoutTransferInput(params.quote),
    wallet: params.wallet,
  });
}

export async function executeHandleUsdcCheckout(params: {
  paymentInstructions: CommunityHandlePaymentInstructions;
  wallet: PirateConnectedEvmWallet;
}): Promise<Hex> {
  return executeUsdcTransfer({
    transfer: resolveHandleCheckoutTransferInput(params.paymentInstructions),
    wallet: params.wallet,
  });
}
