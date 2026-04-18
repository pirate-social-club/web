"use client";

import * as React from "react";

import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { useSession } from "@/lib/api/session-store";

type PrivyProviderComponent = React.ComponentType<{
  appId: string;
  clientId?: string;
  config?: Record<string, unknown>;
  children: React.ReactNode;
}>;
type PrivyAuthBridgeComponent = React.ComponentType<{
  onBusyChange?: (busy: boolean) => void;
  onConnectReady?: (connect: (() => void) | null) => void;
  onModalClosed?: () => void;
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
  loaded: boolean;
  walletsReady: boolean;
};

const PrivyRuntimeContext = React.createContext<PrivyRuntimeState>({
  busy: false,
  connect: null,
  connectedWallets: [],
  configured: false,
  loaded: false,
  walletsReady: false,
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

export function PirateAuthProvider({ children }: { children: React.ReactNode }) {
  const appId = getPrivyAppId();
  const clientId = getPrivyClientId();
  const session = useSession();
  const [busy, setBusy] = React.useState(false);
  const [connectedWallets, setConnectedWallets] = React.useState<PirateConnectedEvmWallet[]>([]);
  const [pendingConnect, setPendingConnect] = React.useState(false);
  const [loadedConnect, setLoadedConnect] = React.useState<(() => void) | null>(null);
  const [ProviderComponent, setProviderComponent] = React.useState<PrivyProviderComponent | null>(null);
  const [BridgeComponent, setBridgeComponent] = React.useState<PrivyAuthBridgeComponent | null>(null);
  const [WalletBridgeComponent, setWalletBridgeComponent] = React.useState<PrivyWalletBridgeComponent | null>(null);
  const [walletsReady, setWalletsReady] = React.useState(false);
  const shouldLoadPrivy = !!appId && (pendingConnect || !!session);

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
    embeddedWallets: {
      ethereum: {
        createOnLogin: "off",
      },
      showWalletUIs: false,
    },
  }), []);

  const unloadPrivy = React.useCallback(() => {
    setPendingConnect(false);
    setBusy(false);
  }, []);

  React.useEffect(() => {
    if (!appId || !shouldLoadPrivy) {
      setProviderComponent(null);
      setBridgeComponent(null);
      setConnectedWallets([]);
      setWalletsReady(false);
      setWalletBridgeComponent(null);
      return;
    }

    let cancelled = false;

    void import("@privy-io/react-auth")
      .then((mod) => {
        if (!cancelled) {
          setProviderComponent(() => mod.PrivyProvider as PrivyProviderComponent);
        }
      })
      .catch((error) => {
        console.error("[PirateAuthProvider] Failed to load PrivyProvider", error);
        if (!cancelled) {
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
        console.error("[PirateAuthProvider] Failed to load PrivyAuthBridge", error);
        if (!cancelled) {
          setBridgeComponent(null);
        }
      });

    void import("@/lib/auth/privy-wallet-bridge")
      .then((mod) => {
        if (!cancelled) {
          setWalletBridgeComponent(() => mod.PrivyWalletBridge as PrivyWalletBridgeComponent);
        }
      })
      .catch((error) => {
        console.error("[PirateAuthProvider] Failed to load PrivyWalletBridge", error);
        if (!cancelled) {
          setWalletBridgeComponent(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appId, shouldLoadPrivy]);

  const connect = React.useCallback(() => {
    if (!appId) {
      return;
    }

    if (loadedConnect) {
      loadedConnect();
      return;
    }

    setPendingConnect(true);
  }, [appId, loadedConnect]);

  React.useEffect(() => {
    if (!pendingConnect || !loadedConnect) {
      return;
    }

    setPendingConnect(false);
    loadedConnect();
  }, [loadedConnect, pendingConnect]);

  const runtimeState = React.useMemo<PrivyRuntimeState>(() => ({
    busy: busy || pendingConnect,
    connect: appId ? connect : null,
    connectedWallets,
    configured: !!appId,
    loaded: !appId || !!ProviderComponent && !!BridgeComponent && !!WalletBridgeComponent,
    walletsReady,
  }), [
    BridgeComponent,
    ProviderComponent,
    WalletBridgeComponent,
    appId,
    busy,
    connect,
    connectedWallets,
    pendingConnect,
    walletsReady,
  ]);

  if (!appId || !shouldLoadPrivy || !ProviderComponent || !BridgeComponent || !WalletBridgeComponent) {
    return (
      <PrivyRuntimeContext.Provider value={runtimeState}>
        {children}
      </PrivyRuntimeContext.Provider>
    );
  }

  return (
    <PrivyRuntimeContext.Provider value={runtimeState}>
      {children}
      <ProviderComponent
        appId={appId}
        clientId={clientId ?? undefined}
        config={privyConfig}
      >
        <BridgeComponent
          onBusyChange={setBusy}
          onConnectReady={setLoadedConnect}
          onModalClosed={unloadPrivy}
        />
        <WalletBridgeComponent
          onWalletsChange={setConnectedWallets}
          onWalletsReadyChange={setWalletsReady}
        />
      </ProviderComponent>
    </PrivyRuntimeContext.Provider>
  );
}
