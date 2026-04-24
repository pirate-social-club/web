"use client";

import * as React from "react";
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

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { clearSession, updateSessionProfile, useSession } from "@/lib/api/session-store";
import { ApiError } from "@/lib/api/client";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { type UiLocaleCode, isUiLocaleCode } from "@/lib/ui-locale-core";
import { getCountryDisplayName, normalizeCountryCode } from "@/lib/countries";
import { useGlobalHandleFlow } from "@/hooks/use-global-handle-flow";
import { useProfileFollowState } from "@/hooks/use-profile-follow-state";
import { toast } from "@/components/primitives/sonner";
import { ProfilePage as ProfilePageComposition } from "@/components/compositions/profile-page/profile-page";
import { SettingsPage } from "@/components/compositions/settings-page/settings-page";
import { WalletHub } from "@/components/compositions/wallet-hub/wallet-hub";
import type { SettingsSubmitState, SettingsTab } from "@/components/compositions/settings-page/settings-page.types";
import type { WalletHubChainId, WalletHubChainSection } from "@/components/compositions/wallet-hub/wallet-hub.types";
import type { ProfileUpdateInput } from "@/lib/api/client-api-types";
import { getPirateNetworkConfig } from "@/lib/network-config";

import { getRouteAuthDescription } from "./route-status-copy";
import { AuthRequiredRouteState } from "./route-shell";
import { useRouteMessages } from "./route-core";
import {
  apiProfileToProps,
  buildSettingsLocaleOptions,
  buildSettingsPath,
  getSelectedProfileHandleLabel,
  mapProfileLinkedHandles,
} from "./profile-settings-mapping";
import { useSettingsOwnedAgents } from "./use-settings-owned-agents";

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
      tokens: [{ id: "story-ip", kind: "native", name: "IP", priceId: "story", symbol: "IP" }],
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
      tokens: [{ id: "atom", kind: "native", name: "Cosmos Hub", priceId: "cosmos", symbol: "ATOM" }],
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
        : balancesByTokenId[`${chain.evmChainId}:${token.id}`] ?? (loading ? "..." : "Unavailable"),
      priceId: token.priceId ?? undefined,
      usdPrice: token.usdPrice ?? (token.priceId ? pricesById[token.priceId] ?? null : null),
    })),
  }));
}

function parseCoinGeckoPrices(value: unknown, priceIds: string[]): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  const prices: Record<string, number> = {};

  for (const priceId of priceIds) {
    const coin = record[priceId];
    if (!coin || typeof coin !== "object") continue;
    const usd = (coin as Record<string, unknown>).usd;
    if (typeof usd === "number" && Number.isFinite(usd)) {
      prices[priceId] = usd;
    }
  }

  return prices;
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function CurrentUserProfilePage() {
  const { copy, localeTag } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const pageTitle = copy.profile.title;
  logger.info("[profile-page] render", { hasProfile: !!profile, hasSession: !!session });
  const followState = useProfileFollowState(profile?.primary_wallet_address ?? null, true);
  const handleFlow = useGlobalHandleFlow({
    currentHandleLabel: profile?.global_handle?.label ?? "",
    onRenamed: async () => {
      toast.success(copy.profile.handleUpdated);
    },
  });

  if (!profile) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("profile")} hideTitleOnMobile title={pageTitle} />;
  }

  return (
    <ProfilePageComposition
      {...apiProfileToProps(profile, true, {
        followersLabel: copy.profile.followersLabel,
        followingLabel: copy.profile.followingLabel,
        joinedStatLabel: copy.common.joinedStatLabel,
      }, followState, localeTag)}
      onEditProfile={() => {
        handleFlow.clearDraft();
        navigate(buildSettingsPath("profile"));
      }}
    />
  );
}

export function CurrentUserWalletPage() {
  const { copy } = useRouteMessages();
  const session = useSession();
  const profile = session?.profile ?? null;
  const walletAttachments = session?.walletAttachments ?? [];
  const pageTitle = copy.wallet.title;
  const balanceChains = React.useMemo(() => buildWalletBalanceChains(), []);
  const priceIds = React.useMemo(
    () => Array.from(new Set(balanceChains.flatMap((chain) => chain.tokens.flatMap((token) => token.priceId ? [token.priceId] : [])))),
    [balanceChains],
  );
  const [balancesByTokenId, setBalancesByTokenId] = React.useState<Record<string, string>>({});
  const [balancesLoading, setBalancesLoading] = React.useState(false);
  const [pricesById, setPricesById] = React.useState<Record<string, number>>({});

  const primaryWallet = walletAttachments.find((wallet) => wallet.is_primary)
    ?? walletAttachments.find((wallet) => wallet.wallet_address === profile?.primary_wallet_address)
    ?? walletAttachments[0]
    ?? null;
  const primaryAddress = profile?.primary_wallet_address ?? primaryWallet?.wallet_address ?? null;
  const normalizedPrimaryAddress = primaryAddress && isAddress(primaryAddress)
    ? getAddress(primaryAddress)
    : null;

  React.useEffect(() => {
    if (!normalizedPrimaryAddress) {
      setBalancesByTokenId({});
      setBalancesLoading(false);
      return;
    }

    let cancelled = false;
    setBalancesLoading(true);

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
    const searchParams = new URLSearchParams({
      ids: priceIds.join(","),
      vs_currencies: "usd",
    });

    void fetch(`https://api.coingecko.com/api/v3/simple/price?${searchParams.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`CoinGecko price request failed with ${response.status}`);
        }
        return response.json() as Promise<unknown>;
      })
      .then((json) => {
        if (!cancelled) {
          setPricesById(parseCoinGeckoPrices(json, priceIds));
        }
      })
      .catch((error) => {
        logger.warn("[wallet] price fetch failed", error);
        if (!cancelled) {
          setPricesById({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [priceIds]);

  if (!profile) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("wallet")} hideTitleOnMobile title={pageTitle} />;
  }

  return (
    <WalletHub
      walletAddress={normalizedPrimaryAddress ?? primaryAddress}
      chainSections={normalizedPrimaryAddress
        ? buildWalletHubChainSections({
          balancesByTokenId,
          chains: balanceChains,
          loading: balancesLoading,
          pricesById,
          walletAddress: normalizedPrimaryAddress ?? primaryAddress,
        })
        : []}
    />
  );
}

export function CurrentUserSettingsPage({ activeTab }: { activeTab: SettingsTab }) {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();
  const profile = session?.profile ?? null;
  const walletAttachments = session?.walletAttachments ?? [];
  const { locale, setLocale } = useUiLocale();
  const pageTitle = copy.settings.title;
  const syncedPrimaryWalletRef = React.useRef<string | null>(null);
  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [preferredLocale, setPreferredLocale] = React.useState<UiLocaleCode>("en");
  const [nationalityBadgeEnabled, setNationalityBadgeEnabled] = React.useState(false);
  const [selectedPrimaryHandleId, setSelectedPrimaryHandleId] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = React.useState(false);
  const [coverRemoved, setCoverRemoved] = React.useState(false);
  const [displayNameError, setDisplayNameError] = React.useState<string | undefined>(undefined);
  const [profileSubmitState, setProfileSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const [publicHandlesSubmitState, setPublicHandlesSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const [preferencesSubmitState, setPreferencesSubmitState] = React.useState<SettingsSubmitState>({ kind: "idle" });
  const ownedAgentsMessages = React.useMemo(() => ({
    agentRegisteredToast: copy.ownedAgents.agentRegisteredToast,
    completeAgentRegistrationError: copy.ownedAgents.completeAgentRegistrationError,
    createPairingError: copy.ownedAgents.createPairingError,
    importInvalidJsonError: copy.ownedAgents.importInvalidJsonError,
    importMissingChallengeError: copy.ownedAgents.importMissingChallengeError,
    importMissingFieldsError: copy.ownedAgents.importMissingFieldsError,
    importRegistrationError: copy.ownedAgents.importRegistrationError,
    missingRegistrationUrlError: copy.ownedAgents.missingRegistrationUrlError,
    ownedAgentsLoadError: copy.ownedAgents.ownedAgentsLoadError,
    ownedAgentsLocalTablesError: copy.ownedAgents.ownedAgentsLocalTablesError,
    registrationIncompleteError: copy.ownedAgents.registrationIncompleteError,
  }), [copy.ownedAgents]);
  const agents = useSettingsOwnedAgents({
    api,
    canRegisterByVerification: session?.user.verification_capabilities?.unique_human?.state === "verified",
    enabled: Boolean(profile && activeTab === "agents"),
    messages: ownedAgentsMessages,
  });

  React.useEffect(() => {
    if (!profile) return;
    const nextPreferredLocale = profile.preferred_locale;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setPreferredLocale(isUiLocaleCode(nextPreferredLocale ?? "") ? nextPreferredLocale as UiLocaleCode : locale);
    setNationalityBadgeEnabled(Boolean(profile.display_verified_nationality_badge));
    setSelectedPrimaryHandleId(profile.primary_public_handle?.linked_handle_id ?? null);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarRemoved(false);
    setCoverRemoved(false);
    setDisplayNameError(undefined);
    setProfileSubmitState({ kind: "idle" });
    setPublicHandlesSubmitState({ kind: "idle" });
    setPreferencesSubmitState({ kind: "idle" });
  }, [locale, profile]);

  React.useEffect(() => {
    if (!profile || activeTab !== "profile") return;
    const primaryWalletAttachmentId = session?.user.primary_wallet_attachment_id ?? null;
    const hasEthereumWallet = walletAttachments.some((wallet) => wallet.chain_namespace === "eip155:1");
    if (!primaryWalletAttachmentId || !hasEthereumWallet) return;

    const syncKey = `${profile.user_id}:${primaryWalletAttachmentId}`;
    if (syncedPrimaryWalletRef.current === syncKey) return;

    syncedPrimaryWalletRef.current = syncKey;
    let cancelled = false;
    void api.profiles.syncLinkedHandles()
      .then((updatedProfile) => {
        if (cancelled) return;
        updateSessionProfile(updatedProfile);
        setSelectedPrimaryHandleId(updatedProfile.primary_public_handle?.linked_handle_id ?? null);
      })
      .catch((error: unknown) => {
        logger.warn("[settings] linked handle sync failed", error);
      });

    return () => { cancelled = true; };
  }, [activeTab, api, profile, session?.user.primary_wallet_attachment_id, walletAttachments]);

  const profilePrimaryHandleId = profile?.primary_public_handle?.linked_handle_id ?? null;
  const currentHandle = profile?.global_handle?.label ? profile.global_handle.label.replace(/\.pirate$/i, "").concat(".pirate") : "";
  const linkedHandles = profile ? mapProfileLinkedHandles(profile) : [];
  const verifiedEnsHandle = linkedHandles.find((handle) => handle.kind === "ens" && handle.verificationState === "verified") ?? null;
  const ensAvatarRef = metadataString(verifiedEnsHandle?.metadata, "avatar");
  const ensCoverRef = metadataString(verifiedEnsHandle?.metadata, "header");
  const ensBio = metadataString(verifiedEnsHandle?.metadata, "description");
  const postAuthorLabel = profile ? getSelectedProfileHandleLabel(profile, selectedPrimaryHandleId) : currentHandle;
  const settingsLocaleOptions = React.useMemo(() => buildSettingsLocaleOptions(copy), [copy]);
  const verifiedNationality = session?.user.verification_capabilities?.nationality;
  const verifiedNationalityCode = verifiedNationality?.state === "verified" && verifiedNationality.provider === "self"
    ? normalizeCountryCode(verifiedNationality.value)?.alpha2 ?? null
    : null;
  const verifiedNationalityName = verifiedNationalityCode ? getCountryDisplayName(verifiedNationalityCode, locale) : null;
  const effectiveNationalityBadgeEnabled = Boolean(verifiedNationalityCode && nationalityBadgeEnabled);
  const profileHasChanges = profile == null ? false : (
    displayName.trim() !== (profile.display_name ?? "").trim()
    || bio !== (profile.bio ?? "")
    || avatarFile !== null
    || coverFile !== null
    || (avatarRemoved && profile.avatar_ref != null)
    || (coverRemoved && profile.cover_ref != null)
  );
  const publicHandlesHasChanges = profile == null ? false : selectedPrimaryHandleId !== profilePrimaryHandleId;
  const preferencesChanged = profile == null ? false : (
    preferredLocale !== (isUiLocaleCode(profile.preferred_locale ?? "") ? profile.preferred_locale : locale)
    || effectiveNationalityBadgeEnabled !== Boolean(profile.display_verified_nationality_badge)
  );

  const handleProfileSave = React.useCallback(async () => {
    if (!profile) return;
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setDisplayNameError(copy.settings.displayNameRequired);
      return;
    }

    setDisplayNameError(undefined);
    setProfileSubmitState({ kind: "saving" });
    try {
      const payload: ProfileUpdateInput = { display_name: trimmedDisplayName };
      const nextBio = bio.trim() ? bio : null;
      if (nextBio !== (profile.bio ?? null)) {
        payload.bio = nextBio;
      }
      if (avatarRemoved) {
        payload.avatar_source = "none";
      } else if (avatarFile) {
        payload.avatar_ref = (await api.profiles.uploadMedia({ kind: "avatar", file: avatarFile })).media_ref;
      }
      if (coverRemoved) {
        payload.cover_source = "none";
      } else if (coverFile) {
        payload.cover_ref = (await api.profiles.uploadMedia({ kind: "cover", file: coverFile })).media_ref;
      }

      const updatedProfile = await api.profiles.updateMe(payload);

      updateSessionProfile(updatedProfile);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarRemoved(updatedProfile.avatar_ref == null);
      setCoverRemoved(updatedProfile.cover_ref == null);
      setProfileSubmitState({ kind: "idle" });
      toast.success(copy.settings.profileUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
    }
  }, [api, avatarFile, avatarRemoved, bio, copy.settings.displayNameRequired, copy.settings.profileUpdated, copy.settings.saveProfileError, coverFile, coverRemoved, displayName, profile]);

  const handlePublicHandlesSave = React.useCallback(async () => {
    if (!profile) return;
    if (selectedPrimaryHandleId === profilePrimaryHandleId) return;

    setPublicHandlesSubmitState({ kind: "saving" });
    try {
      const updatedProfile = await api.profiles.setPrimaryPublicHandle(selectedPrimaryHandleId);
      updateSessionProfile(updatedProfile);
      setSelectedPrimaryHandleId(updatedProfile.primary_public_handle?.linked_handle_id ?? null);
      setPublicHandlesSubmitState({ kind: "idle" });
      toast.success(copy.settings.profileUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setPublicHandlesSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
    }
  }, [api, copy.settings.profileUpdated, copy.settings.saveProfileError, profile, profilePrimaryHandleId, selectedPrimaryHandleId]);

  const handlePreferencesSave = React.useCallback(async () => {
    if (!profile) return;
    setPreferencesSubmitState({ kind: "saving" });
    try {
      const updatedProfile = await api.profiles.updateMe({
        preferred_locale: preferredLocale,
        display_verified_nationality_badge: effectiveNationalityBadgeEnabled,
      });
      updateSessionProfile(updatedProfile);
      setLocale(preferredLocale);
      setPreferencesSubmitState({ kind: "idle" });
      toast.success(copy.settings.preferencesUpdated);
    } catch (e: unknown) {
      const apiErr = e as ApiError;
      setPreferencesSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.savePreferencesError });
    }
  }, [api, copy.settings.preferencesUpdated, copy.settings.savePreferencesError, effectiveNationalityBadgeEnabled, preferredLocale, profile, setLocale]);

  const handleLogout = React.useCallback(() => {
    clearSession();
    navigate("/");
  }, []);

  if (!profile) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("settings")} title={pageTitle} />;
  }

  return (
    <SettingsPage
      activeTab={activeTab}
      onTabChange={(tab) => navigate(buildSettingsPath(tab))}
      preferences={{
        ageStatusLabel: session?.user.verification_capabilities?.age_over_18?.state === "verified"
          ? copy.settings.ageVerified
          : copy.settings.notVerified,
        locale: preferredLocale,
        localeOptions: settingsLocaleOptions,
        nationalityBadgeCountryCode: verifiedNationalityCode,
        nationalityBadgeCountryLabel: verifiedNationalityName
          ? copy.settings.nationalityVerified.replace("{country}", verifiedNationalityName)
          : copy.settings.notVerified,
        nationalityBadgeDisabled: !verifiedNationalityCode,
        nationalityBadgeEnabled: effectiveNationalityBadgeEnabled,
        onLocaleChange: (next) => {
          if (isUiLocaleCode(next)) {
            setPreferredLocale(next);
            setPreferencesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
          }
        },
        onLogout: handleLogout,
        onNationalityBadgeChange: (enabled) => {
          setNationalityBadgeEnabled(enabled);
          setPreferencesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev);
        },
        onSave: handlePreferencesSave,
        saveDisabled: !preferencesChanged || preferencesSubmitState.kind === "saving",
        submitState: preferencesSubmitState,
      }}
      profile={{
        avatarSrc: avatarRemoved ? undefined : profile.avatar_ref ?? undefined,
        avatarSource: avatarRemoved ? "none" : profile.avatar_source ?? null,
        bio,
        bioSource: bio !== (profile.bio ?? "") ? "manual" : profile.bio_source ?? null,
        canUseEnsAvatar: Boolean(ensAvatarRef),
        canUseEnsBio: Boolean(ensBio),
        canUseEnsCover: Boolean(ensCoverRef),
        coverSrc: coverRemoved ? undefined : profile.cover_ref ?? undefined,
        coverSource: coverRemoved ? "none" : profile.cover_source ?? null,
        currentHandle,
        displayName,
        displayNameError,
        ensHandleLabel: verifiedEnsHandle?.label,
        linkedHandles,
        primaryHandleId: selectedPrimaryHandleId,
        onAvatarRemove: () => { setAvatarFile(null); setAvatarRemoved(true); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onAvatarSelect: (file) => { setAvatarFile(file); setAvatarRemoved(false); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onAvatarUseEns: async () => {
          if (!ensAvatarRef) return;
          setProfileSubmitState({ kind: "saving" });
          try {
            const updatedProfile = await api.profiles.updateMe({ avatar_source: "ens" });
            updateSessionProfile(updatedProfile);
            setAvatarFile(null);
            setAvatarRemoved(false);
            setProfileSubmitState({ kind: "idle" });
            toast.success(copy.settings.profileUpdated);
          } catch (e: unknown) {
            const apiErr = e as ApiError;
            setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
          }
        },
        onBioChange: (next) => { setBio(next); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onBioUseEns: async () => {
          if (!ensBio) return;
          setProfileSubmitState({ kind: "saving" });
          try {
            const updatedProfile = await api.profiles.updateMe({ bio_source: "ens" });
            updateSessionProfile(updatedProfile);
            setBio(updatedProfile.bio ?? "");
            setProfileSubmitState({ kind: "idle" });
            toast.success(copy.settings.profileUpdated);
          } catch (e: unknown) {
            const apiErr = e as ApiError;
            setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
          }
        },
        onCoverRemove: () => { setCoverFile(null); setCoverRemoved(true); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onCoverSelect: (file) => { setCoverFile(file); setCoverRemoved(false); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onCoverUseEns: async () => {
          if (!ensCoverRef) return;
          setProfileSubmitState({ kind: "saving" });
          try {
            const updatedProfile = await api.profiles.updateMe({ cover_source: "ens" });
            updateSessionProfile(updatedProfile);
            setCoverFile(null);
            setCoverRemoved(false);
            setProfileSubmitState({ kind: "idle" });
            toast.success(copy.settings.profileUpdated);
          } catch (e: unknown) {
            const apiErr = e as ApiError;
            setProfileSubmitState({ kind: "error", message: apiErr?.message ?? copy.settings.saveProfileError });
          }
        },
        onDisplayNameChange: (next) => { setDisplayName(next); setDisplayNameError(undefined); setProfileSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onPrimaryHandleChange: (handleId) => { setSelectedPrimaryHandleId(handleId); setPublicHandlesSubmitState((prev) => prev.kind === "error" ? { kind: "idle" } : prev); },
        onSave: handleProfileSave,
        onPublicHandlesSave: handlePublicHandlesSave,
        pendingAvatarLabel: avatarFile?.name,
        pendingCoverLabel: coverFile?.name,
        postAuthorLabel,
        publicHandlesSaveDisabled: !publicHandlesHasChanges || publicHandlesSubmitState.kind === "saving",
        publicHandlesSubmitState,
        saveDisabled: !profileHasChanges || profileSubmitState.kind === "saving",
        submitState: profileSubmitState,
      }}
      title={pageTitle}
      agents={agents}
    />
  );
}
