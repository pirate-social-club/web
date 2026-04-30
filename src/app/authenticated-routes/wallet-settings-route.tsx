"use client";

import * as React from "react";
import type { ClaimableRoyaltiesResponse } from "@pirate/api-contracts";
import {
  createPublicClient,
  defineChain,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
  isAddress,
  type Address,
} from "viem";
import { mainnet, optimism, optimismSepolia, sepolia } from "viem/chains";

import { logger } from "@/lib/logger";
import { fetchCachedPrices } from "@/lib/price-cache";
import { WalletHub } from "@/components/compositions/wallet/wallet-hub/wallet-hub";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import type { WalletHubChainId, WalletHubChainSection } from "@/components/compositions/wallet/wallet-hub/wallet-hub.types";
import { getPirateNetworkConfig } from "@/lib/network-config";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";

const LazyRoyaltyClaimModal = React.lazy(async () => {
  const mod = await import("@/components/compositions/wallet/royalty-claim-modal/royalty-claim-modal");
  return { default: mod.RoyaltyClaimModal };
});

const LazyWalletReceiveSheet = React.lazy(async () => {
  const mod = await import("@/components/compositions/wallet/wallet-receive-sheet/wallet-receive-sheet");
  return { default: mod.WalletReceiveSheet };
});

const LazyWalletSendSheet = React.lazy(async () => {
  const mod = await import("@/components/compositions/wallet/wallet-send-sheet/wallet-send-sheet");
  return { default: mod.WalletSendSheet };
});

const EMPTY_CLAIMABLE: ClaimableRoyaltiesResponse = {
  items: [],
  total_claimable_wip_wei: "0",
  checked_at: 0,
};

type WalletBalanceChain = {
  chainId: WalletHubChainId;
  evmChainId: number | null;
  rpcUrl: string | null;
  title: string;
  tokens: WalletBalanceToken[];
};

type WalletBalanceToken =
  | {
    id: string;
    kind: "native";
    name: string;
    priceId: string | null;
    symbol: string;
    usdPrice?: number;
  }
  | {
    address: Address;
    id: string;
    kind: "erc20";
    name: string;
    priceId: string | null;
    symbol: string;
    usdPrice?: number;
  };

const TEMPO_PATH_USD_ADDRESS = "0x20c0000000000000000000000000000000000000" as const;
const ETHEREUM_MAINNET_USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;
const ETHEREUM_MAINNET_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7" as const;
const ETHEREUM_SEPOLIA_USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;
const BASE_MAINNET_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const STORY_WIP_ADDRESS = "0x1514000000000000000000000000000000000000" as const;

function buildWalletBalanceChains(): WalletBalanceChain[] {
  const networkConfig = getPirateNetworkConfig();
  const ethereumChain = networkConfig.base.network === "base-mainnet" ? mainnet : sepolia;
  const optimismChain = networkConfig.base.network === "base-mainnet" ? optimism : optimismSepolia;
  const ethereumRpcUrl = networkConfig.efp.rpcUrlsByChainId[ethereumChain.id] ?? ethereumChain.rpcUrls.default.http[0];
  const optimismRpcUrl = networkConfig.efp.rpcUrlsByChainId[optimismChain.id] ?? optimismChain.rpcUrls.default.http[0];
  const ethereumStablecoins: WalletBalanceToken[] = ethereumChain.id === mainnet.id
    ? [
      {
        address: ETHEREUM_MAINNET_USDC_ADDRESS,
        id: "eth-usdc",
        kind: "erc20",
        name: "USD Coin",
        priceId: "usd-coin",
        symbol: "USDC",
        usdPrice: 1,
      },
      {
        address: ETHEREUM_MAINNET_USDT_ADDRESS,
        id: "eth-usdt",
        kind: "erc20",
        name: "Tether USD",
        priceId: "tether",
        symbol: "USDT",
        usdPrice: 1,
      },
    ]
    : [
      {
        address: ETHEREUM_SEPOLIA_USDC_ADDRESS,
        id: "eth-sepolia-usdc",
        kind: "erc20",
        name: "USD Coin",
        priceId: "usd-coin",
        symbol: "USDC",
        usdPrice: 1,
      },
    ];
  const baseStablecoins: WalletBalanceToken[] = [
    {
      address: networkConfig.base.network === "base-mainnet" ? BASE_MAINNET_USDC_ADDRESS : BASE_SEPOLIA_USDC_ADDRESS,
      id: networkConfig.base.network === "base-mainnet" ? "base-usdc" : "base-sepolia-usdc",
      kind: "erc20",
      name: "USD Coin",
      priceId: "usd-coin",
      symbol: "USDC",
      usdPrice: 1,
    },
  ];

  const chains: WalletBalanceChain[] = [
    {
      chainId: "ethereum",
      evmChainId: ethereumChain.id,
      rpcUrl: ethereumRpcUrl,
      title: ethereumChain.id === mainnet.id ? "Ethereum" : "Ethereum Sepolia",
      tokens: [
        { id: "eth", kind: "native", name: "Ether", priceId: "ethereum", symbol: "ETH" },
        ...ethereumStablecoins,
      ],
    },
    {
      chainId: "base",
      evmChainId: networkConfig.base.chainId,
      rpcUrl: networkConfig.base.rpcUrl,
      title: networkConfig.base.label,
      tokens: [
        { id: "base-eth", kind: "native", name: "Ether", priceId: "ethereum", symbol: "ETH" },
        ...baseStablecoins,
      ],
    },
    {
      chainId: "optimism",
      evmChainId: optimismChain.id,
      rpcUrl: optimismRpcUrl,
      title: optimismChain.id === optimism.id ? "Optimism" : "Optimism Sepolia",
      tokens: [{ id: "op-eth", kind: "native", name: "Ether", priceId: "ethereum", symbol: "ETH" }],
    },
    {
      chainId: "story",
      evmChainId: networkConfig.story.chainId,
      rpcUrl: networkConfig.story.rpcUrl,
      title: networkConfig.story.label,
      tokens: [
        { id: "story-ip", kind: "native", name: "IP", priceId: "story", symbol: "IP" },
        {
          address: STORY_WIP_ADDRESS,
          id: "story-wip",
          kind: "erc20",
          name: "Wrapped IP",
          priceId: "story",
          symbol: "WIP",
        },
      ],
    },
    {
      chainId: "tempo",
      evmChainId: networkConfig.tempo.chainId,
      rpcUrl: networkConfig.tempo.rpcUrl,
      title: networkConfig.tempo.label,
      tokens: [{
        address: TEMPO_PATH_USD_ADDRESS,
        id: "tempo-pathusd",
        kind: "erc20",
        name: "pathUSD",
        priceId: null,
        symbol: "pathUSD",
        usdPrice: 1,
      }],
    },
    {
      chainId: "bitcoin",
      evmChainId: null,
      rpcUrl: null,
      title: "Bitcoin",
      tokens: [{ id: "btc", kind: "native", name: "Bitcoin", priceId: "bitcoin", symbol: "BTC" }],
    },
    {
      chainId: "solana",
      evmChainId: null,
      rpcUrl: null,
      title: "Solana",
      tokens: [{ id: "sol", kind: "native", name: "Solana", priceId: "solana", symbol: "SOL" }],
    },
    {
      chainId: "cosmos",
      evmChainId: null,
      rpcUrl: null,
      title: "Cosmos",
      tokens: [
        { id: "atom", kind: "native", name: "Cosmos Hub", priceId: "cosmos", symbol: "ATOM" },
        { id: "p2p", kind: "native", name: "Sentinel", priceId: null, symbol: "P2P" },
      ],
    },
  ];

  return chains.filter((chain) => chain.rpcUrl === null || chain.rpcUrl.trim().length > 0);
}

function formatNativeBalance(balance: bigint, decimals = 18): string {
  const formatted = formatUnits(balance, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, 4).replace(/0+$/u, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

function buildWalletHubChainSections({
  balancesByTokenId,
  chains,
  loading,
  pricesById,
  walletAddress,
}: {
  balancesByTokenId: Record<string, string>;
  chains: WalletBalanceChain[];
  loading: boolean;
  pricesById: Record<string, number>;
  walletAddress: string | null;
}): WalletHubChainSection[] {
  return chains.map((chain) => ({
    chainId: chain.chainId,
    title: chain.title,
    availability: "ready",
    walletAddress: chain.evmChainId === null ? null : walletAddress,
    tokens: chain.tokens.map((token) => ({
      id: `${chain.evmChainId}:${token.id}`,
      symbol: token.symbol,
      name: token.name,
      balance: chain.evmChainId === null
        ? "0"
        : balancesByTokenId[`${chain.evmChainId}:${token.id}`] ?? (loading ? "..." : walletAddress ? "Unavailable" : "0"),
      priceId: token.priceId ?? undefined,
      usdPrice: token.usdPrice ?? (token.priceId ? pricesById[token.priceId] ?? null : null),
    })),
  }));
}

export function CurrentUserWalletPage() {
  const api = useApi();
  const session = useSession();
  const { configured: privyConfigured } = usePiratePrivyRuntime();
  const { connectedWallets, walletsReady } = usePiratePrivyWallets();
  const profile = session?.profile ?? null;
  const walletAttachments = session?.walletAttachments ?? [];
  const balanceChains = React.useMemo(() => buildWalletBalanceChains(), []);
  const priceIds = React.useMemo(
    () => Array.from(new Set(balanceChains.flatMap((chain) => chain.tokens.flatMap((token) => token.priceId ? [token.priceId] : [])))),
    [balanceChains],
  );
  const [balancesByTokenId, setBalancesByTokenId] = React.useState<Record<string, string>>({});
  const [balancesLoading, setBalancesLoading] = React.useState(false);
  const [pricesById, setPricesById] = React.useState<Record<string, number>>({});
  const [claimableRoyalties, setClaimableRoyalties] = React.useState<ClaimableRoyaltiesResponse>(EMPTY_CLAIMABLE);
  const [claimLoading, setClaimLoading] = React.useState(false);
  const [royaltyClaimOpen, setRoyaltyClaimOpen] = React.useState(false);
  const [walletAction, setWalletAction] = React.useState<"receive" | "send" | null>(null);
  const { schedule: scheduleClaimableRefresh } = useResettableTimeout();

  const primaryWallet = walletAttachments.find((wallet) => wallet.is_primary)
    ?? walletAttachments.find((wallet) => wallet.wallet_address === profile?.primary_wallet_address)
    ?? walletAttachments[0]
    ?? null;
  const primaryAddress = profile?.primary_wallet_address ?? primaryWallet?.wallet_address ?? connectedWallets[0]?.address ?? null;
  const normalizedPrimaryAddress = primaryAddress && isAddress(primaryAddress)
    ? getAddress(primaryAddress)
    : null;
  const walletAddress = normalizedPrimaryAddress ?? primaryAddress;
  const walletActionsPending = Boolean(session) && privyConfigured && !walletAddress && !walletsReady;

  React.useEffect(() => {
    if (!normalizedPrimaryAddress) {
      setBalancesByTokenId({});
      setBalancesLoading(false);
      return;
    }

    let cancelled = false;
    setBalancesLoading(true);
    setBalancesByTokenId({});

    const chainsWithRpc = balanceChains.filter((chain): chain is WalletBalanceChain & { evmChainId: number; rpcUrl: string } => (
      chain.evmChainId !== null && typeof chain.rpcUrl === "string" && chain.rpcUrl.trim().length > 0
    ));

    void Promise.allSettled(chainsWithRpc.flatMap((chain) => chain.tokens.map(async (token) => {
      const publicClient = createPublicClient({
        chain: defineChain({
          id: chain.evmChainId,
          name: chain.title,
          nativeCurrency: {
            decimals: 18,
            name: "USD",
            symbol: chain.chainId === "tempo" ? "USD" : token.symbol,
          },
          rpcUrls: {
            default: {
              http: [chain.rpcUrl],
            },
          },
        }),
        transport: http(chain.rpcUrl),
      });
      const tokenKey = `${chain.evmChainId}:${token.id}`;
      if (token.kind === "native") {
        const balance = await publicClient.getBalance({ address: normalizedPrimaryAddress });
        return [tokenKey, formatNativeBalance(balance)] as const;
      }

      const [balance, decimals] = await Promise.all([
        publicClient.readContract({
          abi: erc20Abi,
          address: token.address,
          functionName: "balanceOf",
          args: [normalizedPrimaryAddress],
        }),
        publicClient.readContract({
          abi: erc20Abi,
          address: token.address,
          functionName: "decimals",
        }),
      ]);
      return [tokenKey, formatNativeBalance(balance, decimals)] as const;
    })))
      .then((results) => {
        if (cancelled) return;
        const entries: Array<readonly [string, string]> = [];
        for (const result of results) {
          if (result.status === "fulfilled") {
            entries.push(result.value);
          } else {
            logger.warn("[wallet] balance fetch failed", result.reason);
          }
        }
        setBalancesByTokenId(Object.fromEntries(entries));
      })
      .finally(() => {
        if (!cancelled) setBalancesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [balanceChains, normalizedPrimaryAddress]);

  React.useEffect(() => {
    if (priceIds.length === 0) {
      setPricesById({});
      return;
    }

    let cancelled = false;

    void fetchCachedPrices(priceIds)
      .then((prices) => {
        if (!cancelled) {
          setPricesById(prices);
        }
      })
      .catch((error: unknown) => {
        logger.warn("[wallet] price fetch failed", error);
        if (!cancelled) {
          setPricesById({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [priceIds]);

  const refreshClaimableRoyalties = React.useCallback(async () => {
    try {
      setClaimLoading(true);
      setClaimableRoyalties(await api.royalties.listClaimable());
    } catch (error) {
      logger.debug("[wallet] failed to load claimable royalties", error);
      setClaimableRoyalties(EMPTY_CLAIMABLE);
    } finally {
      setClaimLoading(false);
    }
  }, [api]);

  React.useEffect(() => {
    if (!session) {
      setClaimableRoyalties(EMPTY_CLAIMABLE);
      setClaimLoading(false);
      setRoyaltyClaimOpen(false);
      setWalletAction(null);
      return;
    }
    void refreshClaimableRoyalties();
  }, [refreshClaimableRoyalties, session]);

  const chainSections = React.useMemo(() => buildWalletHubChainSections({
    balancesByTokenId,
    chains: balanceChains,
    loading: balancesLoading,
    pricesById,
    walletAddress,
  }), [balanceChains, balancesByTokenId, balancesLoading, pricesById, walletAddress]);

  const totalBalanceUsd = React.useMemo(() => {
    let total = 0;
    for (const section of chainSections) {
      for (const token of section.tokens) {
        const balance = token.balance ? Number.parseFloat(token.balance.replace(/,/g, "")) : Number.NaN;
        if (!Number.isFinite(balance) || typeof token.usdPrice !== "number" || !Number.isFinite(token.usdPrice)) {
          continue;
        }
        total += balance * token.usdPrice;
      }
    }
    return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(total);
  }, [chainSections]);

  return (
    <StandardRoutePage size="rail">
      <WalletHub
        chainSections={chainSections}
        claimLoading={claimLoading}
        claimableWipWei={claimableRoyalties.total_claimable_wip_wei}
        onClaim={() => {
          setRoyaltyClaimOpen(true);
        }}
        onReceive={walletAddress ? () => setWalletAction("receive") : undefined}
        onSend={() => setWalletAction("send")}
        totalBalanceUsd={totalBalanceUsd}
        walletActionsPending={walletActionsPending}
        walletAddress={walletAddress}
      />
      {walletAction === "receive" ? (
        <React.Suspense fallback={null}>
          <LazyWalletReceiveSheet
            chainSections={chainSections}
            onOpenChange={(open) => {
              setWalletAction(open ? "receive" : null);
            }}
            open
            walletAddress={walletAddress}
          />
        </React.Suspense>
      ) : null}
      {walletAction === "send" ? (
        <React.Suspense fallback={null}>
          <LazyWalletSendSheet
            chainSections={chainSections}
            onOpenChange={(open) => {
              setWalletAction(open ? "send" : null);
            }}
            open
          />
        </React.Suspense>
      ) : null}
      {royaltyClaimOpen ? (
        <React.Suspense fallback={null}>
          <LazyRoyaltyClaimModal
            onClaimed={() => {
              void refreshClaimableRoyalties();
              scheduleClaimableRefresh(() => {
                void refreshClaimableRoyalties();
              }, 5000);
            }}
            onOpenChange={(open) => {
              setRoyaltyClaimOpen(open);
            }}
            open
          />
        </React.Suspense>
      ) : null}
    </StandardRoutePage>
  );
}
