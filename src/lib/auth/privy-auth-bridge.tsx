"use client";

import * as React from "react";
import { useModalStatus, usePrivy } from "@privy-io/react-auth";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import type { ApiError } from "@/lib/api/client";
import { isOnboardingComplete } from "@/lib/onboarding";
import {
  getSessionAccessTokenExpiryMs,
  isSessionAccessTokenExpiringSoon,
  setSessionClearCallback,
  setSession,
  useSession,
} from "@/lib/api/session-store";
import { logger } from "@/lib/logger";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { toast } from "@/components/primitives/sonner";

const REFRESH_WINDOW_MS = 5 * 60 * 1000;
const RETRY_COOLDOWN_MS = 30 * 1000;
const MAX_RETRY_COUNT = 3;
const AUTH_BOOTSTRAP_WAIT_MS = 1_500;
const AUTH_BOOTSTRAP_POLL_MS = 50;

export interface PrivyAuthBridgeProps {
  connectedWallets?: PirateConnectedEvmWallet[];
  onBusyChange?: (busy: boolean) => void;
  onConnectReady?: (connect: (() => void) | null) => void;
  onModalClosed?: () => void;
}

export function PrivyAuthBridge({
  connectedWallets = [],
  onBusyChange,
  onConnectReady,
  onModalClosed,
}: PrivyAuthBridgeProps) {
  const api = useApi();
  const session = useSession();
  const { isOpen } = useModalStatus();
  const { ready, authenticated, login, getAccessToken, logout } = usePrivy();
  const [busy, setBusy] = React.useState(false);
  const [exchangeRequested, setExchangeRequested] = React.useState(false);
  const retryCountRef = React.useRef(0);
  const retryUntilRef = React.useRef(0);
  const wasOpenRef = React.useRef(false);
  const authStateRef = React.useRef({ authenticated, ready });
  const liveStateRef = React.useRef({ busy: false, authenticated: false, login: login as (() => void) | null, session: false });

  authStateRef.current = { authenticated, ready };
  liveStateRef.current = { busy, authenticated, login: login as (() => void) | null, session: !!session };

  const isInRetryCooldown = React.useCallback((): boolean => {
    return retryCountRef.current >= MAX_RETRY_COUNT && Date.now() < retryUntilRef.current;
  }, []);

  const waitForAuthBootstrap = React.useCallback(async (): Promise<{ authenticated: boolean; ready: boolean }> => {
    if (authStateRef.current.ready) {
      return authStateRef.current;
    }

    const deadline = Date.now() + AUTH_BOOTSTRAP_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, AUTH_BOOTSTRAP_POLL_MS));
      if (authStateRef.current.ready) {
        break;
      }
    }

    return authStateRef.current;
  }, []);

  const exchangePrivySession = React.useCallback(async (options?: {
    silent?: boolean;
    navigateOnFirstSession?: boolean;
  }): Promise<boolean> => {
    const hadSession = !!session;
    setBusy(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error("Privy did not return an access token.");
      }

      const response = await api.auth.sessionExchange({
        type: "privy_access_token",
        privy_access_token: accessToken,
        wallet_address: connectedWallets[0]?.address ?? null,
      });

      setSession(response);
      setExchangeRequested(false);
      retryCountRef.current = 0;
      retryUntilRef.current = 0;

      if (
        options?.navigateOnFirstSession !== false
        && !hadSession
        && !isOnboardingComplete(response.onboarding)
      ) {
        navigate("/onboarding");
      }
      return true;
    } catch (error) {
      const apiError = error as ApiError;
      if (!options?.silent) {
        toast.error(apiError?.message ?? "Privy authentication failed");
      }

      retryCountRef.current += 1;
      if (retryCountRef.current >= MAX_RETRY_COUNT) {
        retryUntilRef.current = Date.now() + RETRY_COOLDOWN_MS;
      }

      setExchangeRequested(false);
      return false;
    } finally {
      setBusy(false);
    }
  }, [api, connectedWallets, getAccessToken, session]);

  React.useEffect(() => {
    setSessionClearCallback(async () => {
      if (!authStateRef.current.authenticated) {
        return;
      }

      await logout().catch((error: unknown) => {
        logger.error("[auth] privy logout failed", error);
      });
    });

    return () => {
      setSessionClearCallback(null);
    };
  }, [logout]);

  React.useEffect(() => {
    api.setRefreshAuthCallback(async () => {
      const authState = ready ? { authenticated, ready } : await waitForAuthBootstrap();
      if (!authState.ready || !authState.authenticated || isInRetryCooldown()) {
        logger.info("[auth] client refresh declined", {
          ready: authState.ready,
          authenticated: authState.authenticated,
          cooldown: isInRetryCooldown(),
        });
        return false;
      }

      return exchangePrivySession({
        silent: true,
        navigateOnFirstSession: false,
      });
    });

    return () => {
      api.setRefreshAuthCallback(null);
    };
  }, [api, authenticated, exchangePrivySession, isInRetryCooldown, ready, waitForAuthBootstrap]);

  React.useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  React.useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }

    if (
      wasOpenRef.current
      && !authenticated
      && !session
      && !exchangeRequested
      && !busy
    ) {
      wasOpenRef.current = false;
      onModalClosed?.();
    }
  }, [authenticated, busy, exchangeRequested, isOpen, onModalClosed, session]);

  React.useEffect(() => {
    if (!authenticated) {
      setExchangeRequested(false);
      retryCountRef.current = 0;
      retryUntilRef.current = 0;
    }
  }, [authenticated]);

  React.useEffect(() => {
    if (!ready || !authenticated || exchangeRequested || busy || isInRetryCooldown()) {
      return;
    }

    if (!session || isSessionAccessTokenExpiringSoon(session, REFRESH_WINDOW_MS)) {
      setExchangeRequested(true);
    }
  }, [authenticated, busy, exchangeRequested, isInRetryCooldown, ready, session]);

  React.useEffect(() => {
    if (!exchangeRequested) {
      return;
    }

    void exchangePrivySession();
  }, [exchangePrivySession, exchangeRequested]);

  React.useEffect(() => {
    if (!ready || !authenticated || !session) {
      return;
    }

    const expiryMs = getSessionAccessTokenExpiryMs(session);
    if (!expiryMs) {
      return;
    }

    const refreshDelay = expiryMs - Date.now() - REFRESH_WINDOW_MS;
    if (refreshDelay <= 0) {
      if (!busy && !exchangeRequested && !isInRetryCooldown()) {
        setExchangeRequested(true);
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isInRetryCooldown()) {
        setExchangeRequested(true);
      }
    }, refreshDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authenticated, isInRetryCooldown, ready, session]);

  React.useEffect(() => {
    if (!ready) {
      onConnectReady?.(null);
      return;
    }

    const stableConnect = () => {
      const { busy: b, authenticated: a, login: l, session: s } = liveStateRef.current;
      if (b) {
        return;
      }

      if (a && !s) {
        setExchangeRequested(true);
        return;
      }

      l?.();
    };

    onConnectReady?.(stableConnect);

    return () => {
      onConnectReady?.(null);
    };
  }, [onConnectReady, ready]);

  React.useEffect(() => {
    if (retryCountRef.current < MAX_RETRY_COUNT || !ready || !authenticated) {
      return;
    }

    const remaining = retryUntilRef.current - Date.now();
    if (remaining <= 0) return;

    const timeoutId = window.setTimeout(() => {
      retryCountRef.current = 0;
      retryUntilRef.current = 0;
    }, remaining);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authenticated, ready]);

  return null;
}
