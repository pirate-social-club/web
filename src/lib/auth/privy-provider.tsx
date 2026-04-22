"use client";

import * as React from "react";
import { defineChain } from "viem";
import {
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "viem/chains";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import {
  getSessionAccessTokenExpiryMs,
  useSession,
} from "@/lib/api/session-store";
import { logger } from "@/lib/logger";
import { getPirateNetworkConfig } from "@/lib/network-config";

type PrivyProviderComponent = React.ComponentType<{
  appId: string;
  clientId?: string;
  config?: Record<string, unknown>;
  children: React.ReactNode;
}>;
type PrivyAuthBridgeComponent = React.ComponentType<{
  connectedWallets?: PirateConnectedEvmWallet[];
  onBusyChange?: (busy: boolean) => void;
  onConnectReady?: (connect: (() => void) | null) => void;
  onModalClosed?: () => void;
  onReadyChange?: (ready: boolean) => void;
}>;
type PrivyWalletBridgeComponent = React.ComponentType<{
  onWalletsChange?: (wallets: PirateConnectedEvmWallet[]) => void;
  onWalletsReadyChange?: (ready: boolean) => void;
}>;

function readEnv(name: "VITE_PRIVY_APP_ID" | "VITE_PRIVY_CLIENT_ID"): string | null {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

type PrivyRuntimeState = {
  busy: boolean;
  connect: (() => void) | null;
  connectedWallets: PirateConnectedEvmWallet[];
  configured: boolean;
  loadError: string | null;
  loaded: boolean;
  walletsReady: boolean;
};

type PrivyWalletDemandContextValue = {
  retainWalletSync: () => () => void;
};

const REFRESH_WINDOW_MS = 5 * 60 * 1000;

const PrivyRuntimeContext = React.createContext<PrivyRuntimeState>({
  busy: false,
  connect: null,
  connectedWallets: [],
  configured: false,
  loadError: null,
  loaded: false,
  walletsReady: false,
});
const PrivyWalletDemandContext = React.createContext<PrivyWalletDemandContextValue>({
  retainWalletSync: () => () => undefined,
});

export function getPrivyAppId(): string | null {
  return readEnv("VITE_PRIVY_APP_ID");
}

export function getPrivyClientId(): string | null {
  return readEnv("VITE_PRIVY_CLIENT_ID");
}

export function isPrivyConfigured(): boolean {
  return getPrivyAppId() !== null;
}

export function usePiratePrivyRuntime(): PrivyRuntimeState {
  return React.useContext(PrivyRuntimeContext);
}

export function usePiratePrivyWallets({ enabled = true }: { enabled?: boolean } = {}) {
  const { connectedWallets, walletsReady } = React.useContext(PrivyRuntimeContext);
  const { retainWalletSync } = React.useContext(PrivyWalletDemandContext);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    return retainWalletSync();
  }, [enabled, retainWalletSync]);

  return {
    connectedWallets: enabled ? connectedWallets : [],
    walletsReady: enabled ? walletsReady : false,
  };
}

export function PirateAuthProvider({
  children,
  deferPrivyUntilConnect = false,
}: {
  children: React.ReactNode;
  deferPrivyUntilConnect?: boolean;
}) {
  const appId = getPrivyAppId();
  const clientId = getPrivyClientId();
  const session = useSession();
  const [busy, setBusy] = React.useState(false);
  const [connectedWallets, setConnectedWallets] = React.useState<PirateConnectedEvmWallet[]>([]);
  const [pendingConnect, setPendingConnect] = React.useState(false);
  const [connectMountRequested, setConnectMountRequested] = React.useState(false);
  const [loadedConnect, setLoadedConnect] = React.useState<(() => void) | null>(null);
  const [ProviderComponent, setProviderComponent] = React.useState<PrivyProviderComponent | null>(null);
  const [BridgeComponent, setBridgeComponent] = React.useState<PrivyAuthBridgeComponent | null>(null);
  const [WalletBridgeComponent, setWalletBridgeComponent] = React.useState<PrivyWalletBridgeComponent | null>(null);
  const [refreshWindowReached, setRefreshWindowReached] = React.useState(false);
  const [walletSyncDemand, setWalletSyncDemand] = React.useState(0);
  const [walletsReady, setWalletsReady] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [privyReady, setPrivyReady] = React.useState(false);
  const shouldLoadWalletSync = walletSyncDemand > 0;
  // Most routes keep Privy mounted so existing Privy auth can refresh Pirate sessions.
  // Some unauthenticated entry points should not open or bootstrap auth until asked.
  const shouldLoadPrivy = !!appId && (
    !deferPrivyUntilConnect
    || pendingConnect
    || connectMountRequested
    || !!session
    || refreshWindowReached
  );

  React.useEffect(() => {
    logger.info("[auth-provider] shouldLoadPrivy changed", { shouldLoadPrivy, deferPrivyUntilConnect, hasSession: !!session, refreshWindowReached, pendingConnect, connectMountRequested });
  }, [shouldLoadPrivy, deferPrivyUntilConnect, session, refreshWindowReached, pendingConnect, connectMountRequested]);

  React.useEffect(() => {
    logger.info("[auth-provider] privyReady changed", { privyReady });
  }, [privyReady]);

  React.useEffect(() => {
    logger.info("[auth-provider] busy changed", { busy, pendingConnect });
  }, [busy, pendingConnect]);
  const networkConfig = React.useMemo(() => getPirateNetworkConfig(), []);
  const supportedChains = React.useMemo(() => {
    const baseChain = networkConfig.base.network === "base-mainnet" ? base : baseSepolia;
    const ethereumChain = networkConfig.base.network === "base-mainnet" ? mainnet : sepolia;
    const optimismChain = networkConfig.base.network === "base-mainnet" ? optimism : optimismSepolia;
    const storyChain = defineChain({
      id: networkConfig.story.chainId,
      name: networkConfig.story.label,
      network: networkConfig.story.network,
      nativeCurrency: {
        decimals: 18,
        name: "IP",
        symbol: "IP",
      },
      rpcUrls: {
        default: {
          http: [networkConfig.story.rpcUrl],
        },
      },
      blockExplorers: {
        default: {
          name: networkConfig.story.label,
          url: networkConfig.story.explorerUrl,
        },
      },
    });

    return {
      defaultChain: baseChain,
      supportedChains: [baseChain, ethereumChain, optimismChain, storyChain],
    };
  }, [networkConfig]);

  const privyConfig = React.useMemo(() => ({
    appearance: {
      accentColor: "#d97706",
      landingHeader: "Sign in to Pirate",
      loginMessage: "Use Privy to continue into the Pirate onboarding flow.",
      theme: "dark",
      showWalletLoginFirst: false,
      walletList: ["detected_wallets", "rabby_wallet", "metamask", "coinbase_wallet", "wallet_connect"],
    },
    loginMethods: ["wallet", "email", "google", "apple", "twitter", "discord", "github", "passkey"],
    loginMethodsAndOrder: {
      primary: ["google", "twitter"],
      overflow: ["email", "apple", "discord", "github", "wallet_connect"],
    },
    embeddedWallets: {
      ethereum: {
        createOnLogin: "off",
      },
      showWalletUIs: false,
    },
    defaultChain: supportedChains.defaultChain,
    supportedChains: supportedChains.supportedChains,
  }), [supportedChains.defaultChain, supportedChains.supportedChains]);

  const unloadPrivy = React.useCallback(() => {
    setPendingConnect(false);
    setConnectMountRequested(false);
    setBusy(false);
  }, []);

  const retainWalletSync = React.useCallback(() => {
    setWalletSyncDemand((current) => current + 1);

    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;
      setWalletSyncDemand((current) => Math.max(0, current - 1));
    };
  }, []);

  React.useEffect(() => {
    const expiryMs = getSessionAccessTokenExpiryMs(session);
    if (!session || !expiryMs) {
      setRefreshWindowReached(false);
      return;
    }

    const refreshAt = expiryMs - REFRESH_WINDOW_MS;
    if (refreshAt <= Date.now()) {
      setRefreshWindowReached(true);
      return;
    }

    setRefreshWindowReached(false);

    const timeoutId = window.setTimeout(() => {
      setRefreshWindowReached(true);
    }, refreshAt - Date.now());

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [session?.accessToken, session]);

  React.useEffect(() => {
    if (!appId || !shouldLoadPrivy) {
      setProviderComponent(null);
      setBridgeComponent(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadError(null);

    void import("@privy-io/react-auth")
      .then((mod) => {
        if (!cancelled) {
          setProviderComponent(() => mod.PrivyProvider as PrivyProviderComponent);
        }
      })
      .catch((error) => {
        logger.error("[PirateAuthProvider] Failed to load PrivyProvider", error);
        if (!cancelled) {
          setLoadError((current) => current ?? `PrivyProvider import failed: ${error instanceof Error ? error.message : String(error)}`);
          setProviderComponent(null);
        }
      });

    void import("@/lib/auth/privy-auth-bridge")
      .then((mod) => {
        if (!cancelled) {
          setBridgeComponent(() => mod.PrivyAuthBridge as PrivyAuthBridgeComponent);
        }
      })
      .catch((error) => {
        logger.error("[PirateAuthProvider] Failed to load PrivyAuthBridge", error);
        if (!cancelled) {
          setLoadError((current) => current ?? `PrivyAuthBridge import failed: ${error instanceof Error ? error.message : String(error)}`);
          setBridgeComponent(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appId, shouldLoadPrivy]);

  React.useEffect(() => {
    if (!appId || !shouldLoadPrivy || !shouldLoadWalletSync) {
      setConnectedWallets([]);
      setWalletsReady(false);
      setWalletBridgeComponent(null);
      return;
    }

    let cancelled = false;

    void import("@/lib/auth/privy-wallet-bridge")
      .then((mod) => {
        if (!cancelled) {
          setWalletBridgeComponent(() => mod.PrivyWalletBridge as PrivyWalletBridgeComponent);
        }
      })
      .catch((error) => {
        logger.error("[PirateAuthProvider] Failed to load PrivyWalletBridge", error);
        if (!cancelled) {
          setWalletBridgeComponent(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appId, shouldLoadPrivy, shouldLoadWalletSync]);

  const connect = React.useCallback(() => {
    logger.info("[auth-provider] connect() invoked", { hasLoadedConnect: !!loadedConnect, stack: new Error().stack });
    if (!appId) {
      return;
    }

    if (loadedConnect) {
      loadedConnect();
      return;
    }

    setPendingConnect(true);
    setConnectMountRequested(true);
  }, [appId, loadedConnect]);

  const handleConnectReady = React.useCallback((next: (() => void) | null) => {
    setLoadedConnect((current) => current === next ? current : next);
  }, []);

  React.useEffect(() => {
    if (!pendingConnect || !loadedConnect) {
      return;
    }

    setPendingConnect(false);
    loadedConnect();
  }, [loadedConnect, pendingConnect]);

  React.useEffect(() => {
    if (!session) {
      return;
    }

    setPendingConnect(false);
    setConnectMountRequested(false);
  }, [session]);

  const runtimeState = React.useMemo<PrivyRuntimeState>(() => ({
    busy: busy || pendingConnect,
    connect: appId ? connect : null,
    connectedWallets,
    configured: !!appId,
    loadError,
    loaded: !appId || !shouldLoadPrivy || !!loadError || (!!ProviderComponent && !!BridgeComponent && privyReady && !busy),
    walletsReady,
  }), [
    BridgeComponent,
    ProviderComponent,
    appId,
    busy,
    connect,
    connectedWallets,
    loadError,
    pendingConnect,
    connectMountRequested,
    privyReady,
    shouldLoadPrivy,
    walletsReady,
  ]);

  if (!appId || !shouldLoadPrivy || !ProviderComponent || !BridgeComponent) {
    return (
      <PrivyWalletDemandContext.Provider value={{ retainWalletSync }}>
        <PrivyRuntimeContext.Provider value={runtimeState}>
          {children}
        </PrivyRuntimeContext.Provider>
      </PrivyWalletDemandContext.Provider>
    );
  }

  return (
    <PrivyWalletDemandContext.Provider value={{ retainWalletSync }}>
      <PrivyRuntimeContext.Provider value={runtimeState}>
        {children}
        <ProviderComponent
          appId={appId}
          clientId={clientId ?? undefined}
          config={privyConfig}
        >
        <BridgeComponent
          connectedWallets={connectedWallets}
          onBusyChange={setBusy}
          onConnectReady={handleConnectReady}
          onModalClosed={unloadPrivy}
          onReadyChange={setPrivyReady}
        />
          {WalletBridgeComponent ? (
            <WalletBridgeComponent
              onWalletsChange={setConnectedWallets}
              onWalletsReadyChange={setWalletsReady}
            />
          ) : null}
        </ProviderComponent>
      </PrivyRuntimeContext.Provider>
    </PrivyWalletDemandContext.Provider>
  );
}
