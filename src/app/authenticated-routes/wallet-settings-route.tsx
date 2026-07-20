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
import { useCreateWallet } from "@privy-io/react-auth";
import { WalletHub } from "@/components/compositions/wallet/wallet-hub/wallet-hub";
import {
  CashoutSheet,
  VerifyHumanSheet,
  type CashoutSheetState,
  type VerifyHumanSheetState,
} from "@/components/compositions/rewards/reward-surfaces";
import { IdentityWalletSection } from "@/components/compositions/wallet/identity-wallet-section/identity-wallet-section";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { ZkPassportVerificationModal } from "@/components/compositions/verification/zkpassport-verification-modal/zkpassport-verification-modal";
import { StandardRoutePage } from "@/components/compositions/app/page-shell";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { toast } from "@/components/primitives/sonner";
import type { WalletHubChainId, WalletHubChainSection, WalletHubRewardsSummary } from "@/components/compositions/wallet/wallet-hub/wallet-hub.types";
import type { ApiRewardCashoutResponse, ApiRewardsSummaryResponse } from "@/lib/api/client-api-types";
import { getPirateNetworkConfig } from "@/lib/network-config";
import { formatCompactAddress } from "@/lib/formatting/address";
import { useResettableTimeout } from "@/hooks/use-resettable-timeout";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import { findPirateEmbeddedEvmWallet } from "@/lib/auth/privy-wallet";
import { useApi } from "@/lib/api";
import { updateSessionIdentityWallet, useSession } from "@/lib/api/session-store";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { useZkPassportVerification } from "@/lib/verification/use-zkpassport-verification";

const LazyRoyaltyClaimModal = React.lazy(async () => {
  const mod = await import("@/components/compositions/wallet/royalty-claim-modal/royalty-claim-modal");
  return { default: mod.RoyaltyClaimModal };
});

const LazyWalletReceiveSheet = React.lazy(async () => {
  const mod = await import("@/components/compositions/wallet/wallet-receive-sheet/wallet-receive-sheet");
  return { default: mod.WalletReceiveSheet };
});

const walletSettingsUsdFormatter = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });

const LazyWalletSendSheet = React.lazy(async () => {
  const mod = await import("@/components/compositions/wallet/wallet-send-sheet/wallet-send-sheet");
  return { default: mod.WalletSendSheet };
});

const EMPTY_CLAIMABLE: ClaimableRoyaltiesResponse = {
  items: [],
  total_claimable_wip_wei: "0",
  checked_at: 0,
};

const EMPTY_REWARDS_SUMMARY: ApiRewardsSummaryResponse = {
  chain_id: 84532,
  balance_cents: 0,
  today_earned_cents: 0,
  recent_events: [],
  cashout: {
    eligible: false,
    min_cents: 100,
    verification_state: "unverified",
  },
  latest_in_flight_cashout: null,
};

const REWARDS_ZKPASSPORT_REQUIREMENTS = [
  { proof_type: "minimum_age" as const, minimum_age: 18 },
];

const REWARDS_CASHOUT_ATTEMPT_KEY = "pirate_rewards_cashout_attempt";

type RewardsCashoutAttempt = {
  amountCents: number;
  cashoutId?: string;
  idempotencyKey: string;
};

function loadRewardsCashoutAttempt(): RewardsCashoutAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REWARDS_CASHOUT_ATTEMPT_KEY) ?? "null") as Partial<RewardsCashoutAttempt> | null;
    if (!parsed || !Number.isSafeInteger(parsed.amountCents) || Number(parsed.amountCents) <= 0 || typeof parsed.idempotencyKey !== "string") return null;
    return {
      amountCents: Number(parsed.amountCents),
      cashoutId: typeof parsed.cashoutId === "string" ? parsed.cashoutId : undefined,
      idempotencyKey: parsed.idempotencyKey,
    };
  } catch {
    return null;
  }
}

function storeRewardsCashoutAttempt(attempt: RewardsCashoutAttempt | null): void {
  if (typeof window === "undefined") return;
  if (attempt) window.localStorage.setItem(REWARDS_CASHOUT_ATTEMPT_KEY, JSON.stringify(attempt));
  else window.localStorage.removeItem(REWARDS_CASHOUT_ATTEMPT_KEY);
}

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

function formatRewardCents(cents: number, chainId: number): string {
  const amount = (cents / 100).toFixed(2);
  if (chainId === 8453) return `$${amount} USDC`;
  if (chainId === 84532) return `${amount} testnet USDC`;
  return `${amount} USDC (chain ${chainId})`;
}

function parseUsdCentsInput(value: string): number | null {
  const normalized = value.trim().replace(/[$,\s]/gu, "");
  if (!/^\d+(?:\.\d{0,2})?$/u.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0").slice(0, 2), 10);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function shortAddress(address: string | null): string {
  if (!address) return "Base wallet";
  return formatCompactAddress(address, { truncateAt: 14 });
}

function baseTxUrl(txHash: string | null): string | undefined {
  if (!txHash) return undefined;
  const explorerUrl = getPirateNetworkConfig().base.explorerUrl.replace(/\/$/u, "");
  return `${explorerUrl}/tx/${txHash}`;
}

function isIdentityConflictError(message: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("already linked") || normalized.includes("different account");
}

function walletRewardsSummary(input: {
  loading: boolean;
  onMoveToWallet: () => void;
  onRetry: () => void;
  onVerify: () => void;
  rewards: ApiRewardsSummaryResponse;
  rewardsCashoutPending: boolean;
  rewardsError: boolean;
}): WalletHubRewardsSummary {
  const amountLabel = input.loading && input.rewards.balance_cents <= 0
    ? "..."
    : formatRewardCents(input.rewards.balance_cents, input.rewards.chain_id);
  if (input.rewardsError) {
    return {
      actionLabel: "Retry",
      amountLabel,
      onAction: input.onRetry,
      supportingLabel: "Could not load.",
    };
  }
  if (input.rewardsCashoutPending) {
    return {
      actionDisabled: true,
      actionLabel: "Pending",
      amountLabel,
      pending: true,
    };
  }
  if (input.rewards.cashout.eligible) {
    return {
      actionLabel: "Claim",
      amountLabel,
      onAction: input.onMoveToWallet,
    };
  }
  if (input.rewards.cashout.verification_state !== "verified") {
    return {
      actionLabel: "Verify",
      amountLabel,
      onAction: input.onVerify,
      supportingLabel: "Verify with Self to earn and transfer.",
    };
  }
  return {
    actionDisabled: true,
    actionLabel: "Claim",
    amountLabel,
    supportingLabel: input.rewards.balance_cents > 0 || input.rewards.today_earned_cents > 0
      ? `${formatRewardCents(input.rewards.cashout.min_cents, input.rewards.chain_id)} minimum`
      : "Earn by practicing.",
  };
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
  const { configured: privyConfigured, connect, getPrivyAccessToken } = usePiratePrivyRuntime();
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
  const [rewardsSummary, setRewardsSummary] = React.useState<ApiRewardsSummaryResponse>(EMPTY_REWARDS_SUMMARY);
  const [rewardsLoading, setRewardsLoading] = React.useState(false);
  const [rewardsError, setRewardsError] = React.useState(false);
  const [rewardsCashoutPending, setRewardsCashoutPending] = React.useState(false);
  const [rewardsCashoutOpen, setRewardsCashoutOpen] = React.useState(false);
  const [rewardsCashoutState, setRewardsCashoutState] = React.useState<CashoutSheetState>("amount-entry");
  const [rewardsCashoutAmountLabel, setRewardsCashoutAmountLabel] = React.useState("$0.00");
  const [rewardsCashoutTxHash, setRewardsCashoutTxHash] = React.useState<string | null>(null);
  const [rewardsCashoutRecipientAddress, setRewardsCashoutRecipientAddress] = React.useState<string | null>(null);
  const [rewardsCashoutErrorMessage, setRewardsCashoutErrorMessage] = React.useState<string | null>(null);
  const [rewardsCashoutAttempt, setRewardsCashoutAttempt] = React.useState<RewardsCashoutAttempt | null>(loadRewardsCashoutAttempt);
  const [rewardsCashoutPollGeneration, setRewardsCashoutPollGeneration] = React.useState(0);
  const [rewardsVerifyOpen, setRewardsVerifyOpen] = React.useState(false);
  const [rewardsVerifyState, setRewardsVerifyState] = React.useState<VerifyHumanSheetState>("provider-selection");
  const [zkPassportModalOpen, setZkPassportModalOpen] = React.useState(false);
  const [royaltyClaimOpen, setRoyaltyClaimOpen] = React.useState(false);
  const [walletAction, setWalletAction] = React.useState<"receive" | "send" | null>(null);
  const { schedule: scheduleClaimableRefresh } = useResettableTimeout();

  // The identity wallet is the verified attachment marked primary. A merely-connected wallet is
  // never shown here as the identity wallet; if there is no primary, the section renders an
  // explicit "No identity wallet selected" empty state.
  const primaryWallet = walletAttachments.find((wallet) => wallet.is_primary)
    ?? walletAttachments.find((wallet) => wallet.wallet_address === profile?.primary_wallet_address)
    ?? null;
  const primaryAddress = profile?.primary_wallet_address ?? primaryWallet?.wallet_address ?? null;
  const connectedEmbeddedWallet = findPirateEmbeddedEvmWallet(connectedWallets);
  const temporaryReceiveAddress = primaryAddress ?? connectedEmbeddedWallet?.address ?? null;
  const primaryAttachmentId = primaryWallet?.wallet_attachment ?? null;
  const [identityWalletPending, setIdentityWalletPending] = React.useState(false);
  const rewardsEnabled = import.meta.env.VITE_REWARDS_ENABLED === "true";

  const handleSelectIdentityWallet = React.useCallback(async (walletAttachmentId: string) => {
    setIdentityWalletPending(true);
    try {
      await api.users.setIdentityWallet(walletAttachmentId);
      updateSessionIdentityWallet(walletAttachmentId);
      toast.success("Identity wallet updated.");
    } catch (error) {
      logger.warn("[wallet] failed to set identity wallet", error);
      toast.error("Could not update your identity wallet. Try again.");
    } finally {
      setIdentityWalletPending(false);
    }
  }, [api]);
  const normalizedWalletAddress = temporaryReceiveAddress && isAddress(temporaryReceiveAddress)
    ? getAddress(temporaryReceiveAddress)
    : null;
  const walletAddress = normalizedWalletAddress ?? temporaryReceiveAddress;
  const walletActionsPending = Boolean(session) && privyConfigured && !walletAddress && !walletsReady;

  // Embedded-wallet provisioning UX: while an authenticated user has no usable wallet, show a
  // "Preparing…" state (the EmbeddedWalletProvisioner is creating one). Only after a grace
  // window with still no wallet do we surface the explicit no-wallet recovery affordances.
  const PROVISION_GRACE_MS = 12_000;
  const needsWallet = Boolean(session) && privyConfigured && !walletAddress;
  const [provisionGraceElapsed, setProvisionGraceElapsed] = React.useState(false);
  const { createWallet: createEmbeddedWallet } = useCreateWallet();
  const [manualProvisionPending, setManualProvisionPending] = React.useState(false);
  React.useEffect(() => {
    if (!needsWallet) {
      setProvisionGraceElapsed(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setProvisionGraceElapsed(true), PROVISION_GRACE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [needsWallet]);
  // Provisioning is invisible on the happy path: while a wallet is being created we show
  // nothing special (the hub's own loading state covers the brief window). Only after a grace
  // window with still no wallet do we surface explicit recovery affordances.
  const isWalletUnavailable = needsWallet && provisionGraceElapsed;
  const handleCreateEmbeddedWallet = React.useCallback(async () => {
    setManualProvisionPending(true);
    try {
      await createEmbeddedWallet();
      setProvisionGraceElapsed(false);
    } catch (error) {
      logger.warn("[wallet] manual embedded wallet creation failed", error);
      toast.error("Could not create your wallet. Try again.");
    } finally {
      setManualProvisionPending(false);
    }
  }, [createEmbeddedWallet]);

  React.useEffect(() => {
    if (!normalizedWalletAddress) {
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
        const balance = await publicClient.getBalance({ address: normalizedWalletAddress });
        return [tokenKey, formatNativeBalance(balance)] as const;
      }

      const [balance, decimals] = await Promise.all([
        publicClient.readContract({
          abi: erc20Abi,
          address: token.address,
          functionName: "balanceOf",
          args: [normalizedWalletAddress],
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
  }, [balanceChains, normalizedWalletAddress]);

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

  const refreshRewardsSummary = React.useCallback(async () => {
    if (!rewardsEnabled) {
      setRewardsSummary(EMPTY_REWARDS_SUMMARY);
      setRewardsLoading(false);
      setRewardsError(false);
      return;
    }
    try {
      setRewardsLoading(true);
      setRewardsError(false);
      const summary = await api.rewards.getSummary();
      setRewardsSummary(summary);
      if (summary.latest_in_flight_cashout) {
        const payout = summary.latest_in_flight_cashout;
        setRewardsCashoutRecipientAddress(payout.recipient_address);
        setRewardsCashoutAttempt((current) => {
          if (current?.cashoutId === payout.id) return current;
          const recovered = {
            amountCents: payout.amount_cents,
            cashoutId: payout.id,
            idempotencyKey: `recovered:${payout.id}`,
          };
          storeRewardsCashoutAttempt(recovered);
          return recovered;
        });
        setRewardsCashoutState("pending");
      }
    } catch (error) {
      logger.debug("[wallet] failed to load rewards", error);
      setRewardsError(true);
    } finally {
      setRewardsLoading(false);
    }
  }, [api, rewardsEnabled]);

  const handleRewardsVerified = React.useCallback(async () => {
    setRewardsVerifyState("success");
    setRewardsVerifyOpen(true);
    setZkPassportModalOpen(false);
    toast.success("Rewards verification complete.");
    await refreshRewardsSummary();
  }, [refreshRewardsSummary]);

  const {
    handleModalOpenChange: handleSelfModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startVerification: startSelfRewardsVerification,
  } = useSelfVerification({
    completeErrorMessage: "Rewards verification failed",
    locale: "en",
    onVerified: handleRewardsVerified,
    startErrorMessage: "Could not start Self verification",
    storageKey: "pirate_pending_self_rewards_cashout",
    verificationIntent: null,
  });

  const {
    startVerification: startVeryRewardsVerification,
    verificationError: veryRewardsError,
    verificationLoading: veryRewardsLoading,
  } = useVeryVerification({
    onVerified: handleRewardsVerified,
    verified: rewardsSummary.cashout.verification_state === "verified",
    verificationIntent: null,
  });

  const {
    checkPendingVerification: checkZkPassportRewardsVerification,
    startVerification: startZkPassportRewardsVerification,
    verificationError: zkPassportRewardsError,
    verificationHref: zkPassportRewardsHref,
    verificationLoading: zkPassportRewardsLoading,
  } = useZkPassportVerification({
    onVerified: handleRewardsVerified,
    verificationIntent: null,
  });

  React.useEffect(() => {
    const message = selfError || veryRewardsError || zkPassportRewardsError;
    if (!message) return;
    setRewardsVerifyState(isIdentityConflictError(message) ? "conflict" : "failure");
    setRewardsVerifyOpen(true);
  }, [selfError, veryRewardsError, zkPassportRewardsError]);

  const handleRewardsVerifyProvider = React.useCallback(async (provider: "self" | "very" | "zkpassport") => {
    setRewardsVerifyState("pending");
    if (provider === "self") {
      const result = await startSelfRewardsVerification({
        requestedCapabilities: ["unique_human"],
        unavailableMessage: "Self verification is unavailable for rewards.",
      });
      if (result.started) {
        setRewardsVerifyOpen(false);
      }
      return;
    }
    if (provider === "very") {
      const result = await startVeryRewardsVerification();
      if (!result.started) {
        setRewardsVerifyState("failure");
      }
      return;
    }

    const result = await startZkPassportRewardsVerification({
      deferOpen: true,
      requestedCapabilities: ["minimum_age"],
      unavailableMessage: "ZKPassport verification is unavailable for rewards.",
      verificationRequirements: REWARDS_ZKPASSPORT_REQUIREMENTS,
    });
    if (result.started) {
      setRewardsVerifyOpen(false);
      setZkPassportModalOpen(true);
    }
  }, [startSelfRewardsVerification, startVeryRewardsVerification, startZkPassportRewardsVerification]);

  const openRewardsCashout = React.useCallback(() => {
    if (!rewardsSummary.cashout.eligible || rewardsSummary.balance_cents <= 0) return;
    setRewardsCashoutAmountLabel((rewardsSummary.balance_cents / 100).toFixed(2));
    setRewardsCashoutTxHash(null);
    setRewardsCashoutRecipientAddress(walletAddress);
    setRewardsCashoutErrorMessage(null);
    setRewardsCashoutState("amount-entry");
    setRewardsCashoutOpen(true);
  }, [rewardsSummary.balance_cents, rewardsSummary.cashout.eligible, walletAddress]);

  const applyCashoutResult = React.useCallback((result: ApiRewardCashoutResponse) => {
    setRewardsCashoutAmountLabel(formatRewardCents(result.payout.amount_cents, result.chain_id));
    setRewardsCashoutTxHash(result.payout.settlement_ref);
    setRewardsCashoutRecipientAddress(result.payout.recipient_address);
    if (result.payout.status === "failed") {
      setRewardsCashoutState("failure");
      setRewardsCashoutErrorMessage(result.payout.failure_reason || "The reward transfer failed. Your reward balance is available to try again.");
      setRewardsCashoutAttempt(null);
      storeRewardsCashoutAttempt(null);
      return;
    }
    if (result.payout.status === "confirmed") {
      setRewardsCashoutState("success");
      setRewardsCashoutAttempt(null);
      storeRewardsCashoutAttempt(null);
      return;
    }
    setRewardsCashoutAttempt((current) => {
      const attempt = current
        ? { ...current, amountCents: result.payout.amount_cents, cashoutId: result.payout.id }
        : { amountCents: result.payout.amount_cents, cashoutId: result.payout.id, idempotencyKey: `recovered:${result.payout.id}` };
      storeRewardsCashoutAttempt(attempt);
      return attempt;
    });
    setRewardsCashoutState("pending");
    setRewardsCashoutErrorMessage(null);
  }, []);

  const handleRewardsCashout = React.useCallback(async () => {
    if (!rewardsSummary.cashout.eligible || rewardsCashoutPending) return;
    const amountCents = parseUsdCentsInput(rewardsCashoutAmountLabel);
    if (!amountCents || amountCents < rewardsSummary.cashout.min_cents || amountCents > rewardsSummary.balance_cents) {
      toast.error("Enter an amount within your available reward credits.");
      return;
    }
    if (rewardsCashoutState === "amount-entry") {
      const attempt = rewardsCashoutAttempt?.amountCents === amountCents
        ? rewardsCashoutAttempt
        : { amountCents, idempotencyKey: `wallet-rewards:${Date.now()}:${crypto.randomUUID()}` };
      setRewardsCashoutAttempt(attempt);
      storeRewardsCashoutAttempt(attempt);
      setRewardsCashoutState("confirm");
      return;
    }
    if (rewardsCashoutState !== "confirm") return;

    setRewardsCashoutPending(true);
    setRewardsCashoutState("pending");
    setRewardsError(false);
    setRewardsCashoutErrorMessage(null);
    try {
      const attempt = rewardsCashoutAttempt?.amountCents === amountCents
        ? rewardsCashoutAttempt
        : { amountCents, idempotencyKey: `wallet-rewards:${Date.now()}:${crypto.randomUUID()}` };
      setRewardsCashoutAttempt(attempt);
      storeRewardsCashoutAttempt(attempt);
      const privyAccessToken = walletAddress && getPrivyAccessToken
        ? await getPrivyAccessToken()
        : null;
      const result = await api.rewards.cashOut({
        amount_cents: amountCents,
        idempotency_key: attempt.idempotencyKey,
        wallet_proof: privyAccessToken
          ? {
              type: "privy_access_token",
              privy_access_token: privyAccessToken,
              wallet_address: walletAddress,
            }
          : null,
      });
      applyCashoutResult(result);
      if (result.payout.status === "failed") toast.error(result.payout.failure_reason || "Reward claim failed.");
      else toast.success(result.payout.status === "confirmed" ? "Reward claim complete." : "Reward claim submitted.");
      await refreshRewardsSummary();
    } catch (error) {
      logger.debug("[wallet] rewards cashout failed", error);
      setRewardsCashoutState("failure");
      setRewardsCashoutErrorMessage("The reward claim could not be submitted. Try again in a moment.");
      toast.error("Reward claim failed. Try again in a moment.");
    } finally {
      setRewardsCashoutPending(false);
    }
  }, [
    api,
    applyCashoutResult,
    refreshRewardsSummary,
    rewardsCashoutAmountLabel,
    rewardsCashoutAttempt,
    rewardsCashoutPending,
    rewardsCashoutState,
    rewardsSummary.balance_cents,
    rewardsSummary.cashout.eligible,
    rewardsSummary.cashout.min_cents,
    getPrivyAccessToken,
    walletAddress,
  ]);

  React.useEffect(() => {
    if (rewardsCashoutAttempt?.cashoutId && rewardsCashoutState === "amount-entry") {
      setRewardsCashoutState("pending");
    }
  }, [rewardsCashoutAttempt?.cashoutId, rewardsCashoutState]);

  React.useEffect(() => {
    const cashoutId = rewardsCashoutAttempt?.cashoutId;
    if (!cashoutId || rewardsCashoutState !== "pending") return;
    let cancelled = false;
    let timeout: number | undefined;
    const delays = [0, 2_000, 4_000, 8_000, 15_000, 30_000, 60_000] as const;
    let attempt = 0;
    const poll = async () => {
      try {
        const result = await api.rewards.getCashout(cashoutId);
        if (!cancelled) {
          applyCashoutResult(result);
          if (result.payout.status !== "submitted") await refreshRewardsSummary();
          else if (attempt < delays.length) {
            timeout = window.setTimeout(() => { void poll(); }, delays[attempt++]);
          } else {
            setRewardsCashoutErrorMessage("This transfer is still processing. Check its status again when you are ready.");
          }
        }
      } catch (error) {
        logger.debug("[wallet] failed to refresh reward cashout", error);
        if (!cancelled && attempt < delays.length) {
          timeout = window.setTimeout(() => { void poll(); }, delays[attempt++]);
        } else if (!cancelled) {
          setRewardsCashoutErrorMessage("Status refresh paused after repeated failures. Check again when you are ready.");
        }
      }
    };
    timeout = window.setTimeout(() => { void poll(); }, delays[attempt++]);
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [api, applyCashoutResult, refreshRewardsSummary, rewardsCashoutAttempt?.cashoutId, rewardsCashoutPollGeneration, rewardsCashoutState]);

  React.useEffect(() => {
    if (!session) {
      setClaimableRoyalties(EMPTY_CLAIMABLE);
      setClaimLoading(false);
      setRewardsSummary(EMPTY_REWARDS_SUMMARY);
      setRewardsLoading(false);
      setRewardsError(false);
      setRoyaltyClaimOpen(false);
      setRewardsCashoutOpen(false);
      setWalletAction(null);
      return;
    }
    void refreshClaimableRoyalties();
    void refreshRewardsSummary();
  }, [refreshClaimableRoyalties, refreshRewardsSummary, session]);

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
    return walletSettingsUsdFormatter.format(total);
  }, [chainSections]);

  const rewardsHubSummary = rewardsEnabled
    ? walletRewardsSummary({
      loading: rewardsLoading,
      onMoveToWallet: openRewardsCashout,
      onRetry: () => {
        void refreshRewardsSummary();
      },
      onVerify: () => {
        setRewardsVerifyState("provider-selection");
        setRewardsVerifyOpen(true);
      },
      rewards: rewardsSummary,
      rewardsCashoutPending: rewardsCashoutPending || rewardsCashoutState === "pending",
      rewardsError,
    })
    : undefined;

  return (
    <StandardRoutePage size="rail">
      {isWalletUnavailable ? (
        <Card className="space-y-3 p-5">
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">No wallet available</p>
            <p className="text-base text-muted-foreground">
              We couldn’t finish setting up your Pirate wallet. Create one now, or connect an
              external wallet instead.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={manualProvisionPending}
              onClick={() => { void handleCreateEmbeddedWallet(); }}
              size="sm"
            >
              Create wallet
            </Button>
            <Button
              disabled={!connect}
              onClick={() => connect?.()}
              size="sm"
              variant="outline"
            >
              Connect external wallet
            </Button>
          </div>
        </Card>
      ) : null}
      <WalletHub
        chainSections={chainSections}
        claimLoading={claimLoading}
        claimableWipWei={claimableRoyalties.total_claimable_wip_wei}
        onClaim={() => {
          setRoyaltyClaimOpen(true);
        }}
        onReceive={walletAddress ? () => setWalletAction("receive") : undefined}
        onSend={primaryAttachmentId ? () => setWalletAction("send") : undefined}
        rewardsSummary={rewardsHubSummary}
        totalBalanceUsd={totalBalanceUsd}
        walletActionsPending={walletActionsPending}
        walletAddress={walletAddress}
      />
      {rewardsEnabled ? (
        <CashoutSheet
          amountLabel={rewardsCashoutAmountLabel}
          availableLabel={formatRewardCents(rewardsSummary.balance_cents, rewardsSummary.chain_id)}
          basescanUrl={baseTxUrl(rewardsCashoutTxHash)}
          errorMessage={rewardsCashoutErrorMessage ?? undefined}
          minimumCashoutLabel={formatRewardCents(rewardsSummary.cashout.min_cents, rewardsSummary.chain_id)}
          onAmountChange={setRewardsCashoutAmountLabel}
          onConfirm={() => {
            void handleRewardsCashout();
          }}
          onOpenChange={(open) => {
            setRewardsCashoutOpen(open);
            if (!open && rewardsCashoutState !== "pending") {
              setRewardsCashoutState("amount-entry");
            }
          }}
          onRefresh={() => {
            setRewardsCashoutErrorMessage(null);
            setRewardsCashoutPollGeneration((generation) => generation + 1);
          }}
          open={rewardsCashoutOpen}
          recipientLabel={shortAddress(rewardsCashoutRecipientAddress ?? walletAddress)}
          state={rewardsCashoutState}
          txHashLabel={rewardsCashoutTxHash ?? undefined}
        />
      ) : null}
      {rewardsEnabled ? (
        <VerifyHumanSheet
          onOpenChange={setRewardsVerifyOpen}
          onSelectProvider={(provider) => {
            void handleRewardsVerifyProvider(provider);
          }}
          open={rewardsVerifyOpen}
          providers={["self"]}
          state={(selfLoading || veryRewardsLoading || zkPassportRewardsLoading) && rewardsVerifyState !== "failure" && rewardsVerifyState !== "conflict"
            ? "pending"
            : rewardsVerifyState}
        />
      ) : null}
      {selfPrompt ? (
        <SelfVerificationModal
          actionLabel={selfPrompt.actionLabel}
          description={selfPrompt.description}
          error={selfError}
          href={selfPrompt.href}
          onOpenChange={handleSelfModalOpenChange}
          onQrError={handleSelfQrError}
          onQrSuccess={handleSelfQrSuccess}
          open={selfModalOpen}
          selfApp={selfPrompt.selfApp}
          title={selfPrompt.title}
        />
      ) : null}
      {zkPassportRewardsHref ? (
        <ZkPassportVerificationModal
          actionLabel="Open ZKPassport"
          checkLoading={zkPassportRewardsLoading}
          description="Complete an 18+ passport proof for reward claims. Pirate receives only the proof result and a reusable nullifier."
          error={zkPassportRewardsError}
          href={zkPassportRewardsHref}
          onCheckPending={() => checkZkPassportRewardsVerification()}
          onOpenChange={setZkPassportModalOpen}
          open={zkPassportModalOpen}
          title="Verify with ZKPassport"
        />
      ) : null}
      <IdentityWalletSection
        connectedWallets={connectedWallets}
        onSelect={(walletAttachmentId) => {
          void handleSelectIdentityWallet(walletAttachmentId);
        }}
        pending={identityWalletPending}
        primaryAttachmentId={primaryAttachmentId}
        walletAttachments={walletAttachments}
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
