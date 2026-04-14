"use client";

import * as React from "react";

type PrivyProviderComponent = React.ComponentType<{
  appId: string;
  clientId?: string;
  config?: Record<string, unknown>;
  children: React.ReactNode;
}>;

function readEnv(name: "VITE_PRIVY_APP_ID" | "VITE_PRIVY_CLIENT_ID"): string | null {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

type PrivyRuntimeState = {
  configured: boolean;
  loaded: boolean;
};

const PrivyRuntimeContext = React.createContext<PrivyRuntimeState>({
  configured: false,
  loaded: false,
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
  const [ProviderComponent, setProviderComponent] = React.useState<PrivyProviderComponent | null>(null);

  React.useEffect(() => {
    if (!appId) return;

    let cancelled = false;

    void import("@privy-io/react-auth")
      .then((mod) => {
        if (!cancelled) {
          setProviderComponent(() => mod.PrivyProvider as PrivyProviderComponent);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProviderComponent(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appId]);

  const runtimeState = React.useMemo<PrivyRuntimeState>(() => ({
    configured: !!appId,
    loaded: !!ProviderComponent,
  }), [ProviderComponent, appId]);

  if (!appId || !ProviderComponent) {
    return (
      <PrivyRuntimeContext.Provider value={runtimeState}>
        {children}
      </PrivyRuntimeContext.Provider>
    );
  }

  return (
    <PrivyRuntimeContext.Provider value={runtimeState}>
      <ProviderComponent
        appId={appId}
        clientId={clientId ?? undefined}
        config={{
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
        }}
      >
        {children}
      </ProviderComponent>
    </PrivyRuntimeContext.Provider>
  );
}
