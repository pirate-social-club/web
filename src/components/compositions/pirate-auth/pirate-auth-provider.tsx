"use client";

import * as React from "react";

import { toast } from "@/components/primitives/sonner";
import { createPrivyConfig, getPrivyAppId } from "@/lib/privy";
import {
  PIRATE_ACCESS_TOKEN_EVENT,
  exchangePrivySession,
  PirateApiError,
  readPirateAccessToken,
  storePirateAccessToken,
} from "@/lib/pirate-api";

type PrivyRuntimeModule = typeof import("@privy-io/react-auth");

type PirateAuthContextValue = {
  accessToken: string | null;
  connect: () => void;
  isBrowserAuthenticated: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  isConfigured: boolean;
  isConnecting: boolean;
  runtimeErrorMessage: string | null;
  runtimeStatus: "missing_app_id" | "loading_runtime" | "runtime_error" | "ready";
};

let privyRuntimeModulePromise: Promise<PrivyRuntimeModule> | null = null;
let privyRuntimeModuleCache: PrivyRuntimeModule | null = null;

function logPirateAuth(event: string, details?: Record<string, unknown>) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info("[pirate-auth]", event, details ?? {});
}

const PirateAuthContext = React.createContext<PirateAuthContextValue>({
  accessToken: null,
  connect: () => {},
  isBrowserAuthenticated: false,
  isAuthenticated: false,
  isReady: false,
  isConfigured: false,
  isConnecting: false,
  runtimeErrorMessage: null,
  runtimeStatus: "missing_app_id",
});

function PirateAuthSyncInner({
  children,
  runtime,
}: {
  children: React.ReactNode;
  runtime: PrivyRuntimeModule;
}) {
  const { useIdentityToken, usePrivy } = runtime;
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  const [accessToken, setAccessToken] = React.useState<string | null>(() => readPirateAccessToken());
  const [isOpeningLogin, setIsOpeningLogin] = React.useState(false);
  const [isExchangingSession, setIsExchangingSession] = React.useState(false);
  const [sessionExchangeFailureMessage, setSessionExchangeFailureMessage] = React.useState<string | null>(null);

  const describeSessionExchangeError = React.useCallback((error: unknown) => {
    if (error instanceof PirateApiError) {
      if (error.message === "PRIVY_APP_ID is not configured") {
        return {
          logDetails: {
            code: error.code ?? null,
            message: error.message,
            path: error.path,
            source: "pirate-api",
            status: error.status,
          },
          toastMessage: "pirate-api is missing PRIVY_APP_ID for /auth/session/exchange.",
        };
      }

      return {
        logDetails: {
          code: error.code ?? null,
          message: error.message,
          path: error.path,
          source: "pirate-api",
          status: error.status,
        },
        toastMessage: error.message,
      };
    }

    return {
      logDetails: {
        message: error instanceof Error ? error.message : "Could not finish sign-in",
        source: "client",
      },
      toastMessage: error instanceof Error ? error.message : "Could not finish sign-in",
    };
  }, []);

  React.useEffect(() => {
    const syncToken = () => {
      const nextToken = readPirateAccessToken();
      logPirateAuth("token-sync", { hasAccessToken: Boolean(nextToken) });
      setAccessToken(nextToken);
    };

    window.addEventListener(PIRATE_ACCESS_TOKEN_EVENT, syncToken);
    window.addEventListener("storage", syncToken);

    return () => {
      window.removeEventListener(PIRATE_ACCESS_TOKEN_EVENT, syncToken);
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  React.useEffect(() => {
    logPirateAuth("privy-state", {
      authenticated,
      hasAccessToken: Boolean(accessToken),
      hasSessionExchangeFailure: Boolean(sessionExchangeFailureMessage),
      isExchangingSession,
      isOpeningLogin,
      ready,
    });
  }, [accessToken, authenticated, isExchangingSession, isOpeningLogin, ready, sessionExchangeFailureMessage]);

  React.useEffect(() => {
    if (!ready || !authenticated || accessToken || isExchangingSession || sessionExchangeFailureMessage) {
      if (ready && authenticated && sessionExchangeFailureMessage) {
        logPirateAuth("session-exchange:blocked", {
          message: sessionExchangeFailureMessage,
        });
      }
      return;
    }

    logPirateAuth("session-exchange:start", {
      hasIdentityToken: Boolean(identityToken),
    });
    setIsExchangingSession(true);

    void (async () => {
      try {
        const privyAccessToken = await getAccessToken();
        if (!privyAccessToken) {
          throw new Error("Privy did not return an access token");
        }

        logPirateAuth("session-exchange:privy-token", {
          hasPrivyAccessToken: true,
        });

        const session = await exchangePrivySession({
          accessToken: privyAccessToken,
          identityToken,
        });
        logPirateAuth("session-exchange:success", {
          handle: session.profile.global_handle.label,
          userId: session.user.user_id,
          walletCount: session.wallet_attachments.length,
        });
        setSessionExchangeFailureMessage(null);
        storePirateAccessToken(session.access_token);
      } catch (error) {
        const { logDetails, toastMessage } = describeSessionExchangeError(error);
        console.error("[pirate-auth] session-exchange:error", error);
        logPirateAuth("session-exchange:error", logDetails);
        setSessionExchangeFailureMessage(toastMessage);
        toast.error(toastMessage, {
          id: "pirate-auth-session-exchange",
        });
      } finally {
        setIsExchangingSession(false);
      }
    })();
  }, [accessToken, authenticated, describeSessionExchangeError, getAccessToken, identityToken, isExchangingSession, ready, sessionExchangeFailureMessage]);

  React.useEffect(() => {
    if (ready && authenticated) {
      logPirateAuth("login-finished");
      setIsOpeningLogin(false);
    }
  }, [authenticated, ready]);

  React.useEffect(() => {
    if (ready && !authenticated && !accessToken) {
      logPirateAuth("session-reset");
      setIsOpeningLogin(false);
      setIsExchangingSession(false);
      setSessionExchangeFailureMessage(null);
    }
  }, [accessToken, authenticated, ready]);

  const connect = React.useCallback(() => {
    logPirateAuth("connect-click");
    setIsOpeningLogin(true);
    setSessionExchangeFailureMessage(null);
    try {
      login();
    } catch (error) {
      console.error("[pirate-auth] open-privy:error", error);
      setIsOpeningLogin(false);
      toast.error(error instanceof Error ? error.message : "Could not open Privy", {
        id: "pirate-auth-open-privy",
      });
    }
  }, [login]);

  const isConnecting = isOpeningLogin || isExchangingSession;

  const value = React.useMemo<PirateAuthContextValue>(() => ({
    accessToken,
    connect,
    isBrowserAuthenticated: authenticated,
    isAuthenticated: Boolean(accessToken),
    isReady: ready,
    isConfigured: true,
    isConnecting,
    runtimeErrorMessage: null,
    runtimeStatus: "ready",
  }), [accessToken, authenticated, connect, isConnecting, ready]);

  return (
    <PirateAuthContext.Provider value={value}>
      {children}
    </PirateAuthContext.Provider>
  );
}

function PirateAuthFallbackProvider({
  children,
  accessToken: initialAccessToken = null,
  isConfigured = false,
  runtimeErrorMessage = null,
  runtimeStatus = "missing_app_id",
}: {
  children: React.ReactNode;
  accessToken?: string | null;
  isConfigured?: boolean;
  runtimeErrorMessage?: string | null;
  runtimeStatus?: PirateAuthContextValue["runtimeStatus"];
}) {
  const [accessToken, setAccessToken] = React.useState<string | null>(initialAccessToken);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncToken = () => {
      setAccessToken(readPirateAccessToken());
    };

    syncToken();
    window.addEventListener(PIRATE_ACCESS_TOKEN_EVENT, syncToken);
    window.addEventListener("storage", syncToken);

    return () => {
      window.removeEventListener(PIRATE_ACCESS_TOKEN_EVENT, syncToken);
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  const value = React.useMemo<PirateAuthContextValue>(() => ({
    accessToken,
    connect: () => {
      if (runtimeStatus === "runtime_error") {
        toast.error(runtimeErrorMessage ?? "Privy could not load in this browser session.");
        return;
      }

      toast.error("Set VITE_PRIVY_APP_ID before using browser connect.");
    },
    isBrowserAuthenticated: false,
    isAuthenticated: Boolean(accessToken),
    isReady: runtimeStatus !== "loading_runtime",
    isConfigured,
    isConnecting: false,
    runtimeErrorMessage,
    runtimeStatus,
  }), [accessToken, isConfigured, runtimeErrorMessage, runtimeStatus]);

  return (
    <PirateAuthContext.Provider value={value}>
      {children}
    </PirateAuthContext.Provider>
  );
}

export function PirateAuthProvider({ children }: { children: React.ReactNode }) {
  const privyAppId = getPrivyAppId();
  const [runtime, setRuntime] = React.useState<PrivyRuntimeModule | null>(null);
  const [runtimeErrorMessage, setRuntimeErrorMessage] = React.useState<string | null>(null);
  const initialAccessToken = React.useMemo(() => readPirateAccessToken(), []);

  if (!privyAppId) {
    return <PirateAuthFallbackProvider accessToken={initialAccessToken}>{children}</PirateAuthFallbackProvider>;
  }

  React.useEffect(() => {
    let cancelled = false;

    if (privyRuntimeModuleCache) {
      setRuntime(privyRuntimeModuleCache);
      return () => {
        cancelled = true;
      };
    }

    logPirateAuth("runtime-load:start", {
      hasPrivyAppId: true,
    });
    setRuntimeErrorMessage(null);
    privyRuntimeModulePromise ??= import("@privy-io/react-auth");
    void privyRuntimeModulePromise.then((module) => {
      if (!cancelled) {
        privyRuntimeModuleCache = module;
        logPirateAuth("runtime-load:success");
        setRuntime(module);
      }
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Could not load Privy runtime";
      console.error("Could not load Privy runtime", error);
      logPirateAuth("runtime-load:error", {
        message,
      });
      if (!cancelled) {
        setRuntimeErrorMessage(message);
        setRuntime(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!runtime) {
    return (
      <PirateAuthFallbackProvider
        accessToken={initialAccessToken}
        isConfigured={true}
        runtimeErrorMessage={runtimeErrorMessage}
        runtimeStatus={runtimeErrorMessage ? "runtime_error" : "loading_runtime"}
      >
        {children}
      </PirateAuthFallbackProvider>
    );
  }

  return (
    <runtime.PrivyProvider appId={privyAppId} config={createPrivyConfig()}>
      <PirateAuthSyncInner runtime={runtime}>{children}</PirateAuthSyncInner>
    </runtime.PrivyProvider>
  );
}

export function usePirateAuth() {
  return React.useContext(PirateAuthContext);
}
