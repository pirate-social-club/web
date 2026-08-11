"use client";

import * as React from "react";

import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { useApi } from "@/lib/api";
import type { StoredSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";
import { publishChatInboxId } from "@/lib/chat/chat-xmtp-client";
import {
  ensureXmtpClient,
  getSessionWalletAddresses,
  getSharedXmtpClientCache,
  isLikelyXmtpTabContentionError,
  resolveXmtpSignerWallet,
  resolveXmtpWalletAddress,
  setXmtpRegistrationHint,
  XmtpRegistrationRequiredError,
  type XmtpClientCache,
} from "@/lib/chat/chat-xmtp-support";
import type { ChatRouteMode } from "@/lib/chat/chat-types";
import { logger } from "@/lib/logger";

export type XmtpSetupPhase = "checking" | "needs-enablement" | "enabling" | "ready" | "error";

function summarizeConnectedWallets(wallets: readonly PirateConnectedEvmWallet[]) {
  return wallets.map((wallet) => ({
    address: wallet.address,
    walletClientType: wallet.walletClientType ?? null,
  }));
}

function summarizeConnectedWalletAddresses(wallets: readonly PirateConnectedEvmWallet[]) {
  return wallets.map((wallet) => wallet.address).join(",") || null;
}

function summarizeSessionWallets(session: StoredSession | null) {
  return (session?.walletAttachments ?? []).map((wallet: { wallet_address?: string | null; chain_namespace?: string | null; is_primary?: boolean | null }) => ({
    address: wallet.wallet_address ?? null,
    chainNamespace: wallet.chain_namespace ?? null,
    isPrimary: wallet.is_primary ?? null,
  }));
}

function summarizeSessionWalletAddresses(session: StoredSession | null) {
  return session ? getSessionWalletAddresses(session).join(",") || null : null;
}

function buildMissingSignerDiagnostic({
  connectedWallets,
  privyRuntime,
  session,
  setupKey,
  walletsReady,
}: {
  connectedWallets: readonly PirateConnectedEvmWallet[];
  privyRuntime: ReturnType<typeof usePiratePrivyRuntime>;
  session: StoredSession | null;
  setupKey: string | null;
  walletsReady: boolean;
}) {
  return {
    reason: "missing_xmtp_signer_wallet",
    setupKey,
    hasPirateSession: !!session,
    userId: session?.user.id ?? null,
    primaryWalletAddress: session?.profile.primary_wallet_address ?? null,
    primaryWalletAttachmentId: session?.user.primary_wallet_attachment ?? null,
    sessionWalletAddresses: summarizeSessionWalletAddresses(session),
    walletAttachments: summarizeSessionWallets(session),
    walletsReady,
    connectedWalletAddresses: summarizeConnectedWalletAddresses(connectedWallets),
    connectedWallets: summarizeConnectedWallets(connectedWallets),
    privy: {
      configured: privyRuntime.configured,
      loaded: privyRuntime.loaded,
      busy: privyRuntime.busy,
      ready: privyRuntime.privyReady,
      authenticated: privyRuntime.privyAuthenticated,
      walletSyncMounted: privyRuntime.walletSyncMounted,
    },
  };
}

export function useXmtpSetup({
  clientHydrated,
  mode,
  routeConversationId,
  routeTarget,
  session,
}: {
  clientHydrated: boolean;
  mode: ChatRouteMode;
  routeConversationId: string | null;
  routeTarget: string | null;
  session: StoredSession | null;
}): {
  authBroken: boolean;
  connect: (() => void) | undefined;
  handleEnableMessages: () => void;
  handleReconnectEthereumWallet: () => void;
  hasWarmXmtpClient: boolean;
  privyBusy: boolean;
  setXmtpSetupError: React.Dispatch<React.SetStateAction<string | null>>;
  setXmtpSetupPhase: React.Dispatch<React.SetStateAction<XmtpSetupPhase>>;
  walletHydrating: boolean;
  xmtpClientCache: XmtpClientCache;
  xmtpReady: boolean;
  xmtpSetupError: string | null;
  xmtpSetupPhase: XmtpSetupPhase;
  xmtpSignerWallet: PirateConnectedEvmWallet | null;
} {
  const api = useApi();
  const privyRuntime = usePiratePrivyRuntime();
  const { connectedWallets, walletsReady } = usePiratePrivyWallets();
  const [xmtpSetupPhase, setXmtpSetupPhase] = React.useState<XmtpSetupPhase>("checking");
  const [xmtpSetupError, setXmtpSetupError] = React.useState<string | null>(null);
  const lastMissingSignerDiagnosticRef = React.useRef<string | null>(null);
  const setupRequestRef = React.useRef(0);
  const xmtpClientCache = React.useMemo(() => getSharedXmtpClientCache(), []);
  const xmtpReady = xmtpSetupPhase === "ready";
  const setupKey = session
    ? `${session.user.id}:${session.profile.primary_wallet_address ?? session.walletAttachments[0]?.wallet_address ?? "no-wallet"}`
    : null;
  const xmtpSignerWallet = React.useMemo(
    () => session ? resolveXmtpSignerWallet(session, connectedWallets) : null,
    [connectedWallets, session],
  );
  const walletHydrating = !!session && privyRuntime.configured && (!privyRuntime.privyReady || !walletsReady);
  const authBroken = !!session && !walletHydrating && !xmtpSignerWallet;
  const sessionWalletAddress = session ? resolveXmtpWalletAddress(session, xmtpSignerWallet) : null;
  const hasWarmXmtpClient = !!sessionWalletAddress
    && xmtpClientCache.clientWalletAddress === sessionWalletAddress
    && !!xmtpClientCache.clientInstance;
  const missingSignerDiagnostic = React.useMemo(() => buildMissingSignerDiagnostic({
    connectedWallets,
    privyRuntime,
    session,
    setupKey,
    walletsReady,
  }), [connectedWallets, privyRuntime, session, setupKey, walletsReady]);

  const logMissingXmtpSigner = React.useCallback((source: string, options?: { force?: boolean }) => {
    const key = JSON.stringify(missingSignerDiagnostic);
    if (!options?.force && lastMissingSignerDiagnosticRef.current === key) {
      return;
    }

    lastMissingSignerDiagnosticRef.current = key;
    logger.warn("[chat:xmtp] signer-wallet-unavailable", {
      ...missingSignerDiagnostic,
      source,
    });
  }, [missingSignerDiagnostic]);

  const publishInboxBestEffort = React.useCallback((inboxId: string | null) => {
    logger.info("[chat:xmtp] inbox-publish:start", {
      hasInboxId: typeof inboxId === "string" && inboxId.trim().length > 0,
      inboxId: typeof inboxId === "string" ? inboxId : null,
    });
    void publishChatInboxId(api, inboxId)
      .then(() => {
        logger.info("[chat:xmtp] inbox-publish:success", {
          inboxId: typeof inboxId === "string" ? inboxId : null,
        });
      })
      .catch((publishError) => {
        logger.warn("[chat:xmtp] inbox-publish:failed", publishError);
      });
  }, [api]);

  React.useEffect(() => {
    logger.info("[chat] setup state", {
      authBroken,
      clientHydrated,
      connectedWalletCount: connectedWallets.length,
      connectedWalletAddresses: summarizeConnectedWalletAddresses(connectedWallets),
      connectedWallets: summarizeConnectedWallets(connectedWallets),
      hasConnect: !!privyRuntime.connect,
      hasRouteTarget: !!routeTarget,
      hasSession: !!session,
      hasXmtpSignerWallet: !!xmtpSignerWallet,
      mode: mode.kind,
      primaryWalletAddress: session?.profile.primary_wallet_address ?? null,
      privyConfigured: privyRuntime.configured,
      privyLoaded: privyRuntime.loaded,
      privyReady: privyRuntime.privyReady,
      routeConversationId,
      sessionWalletAddress,
      sessionWalletAddresses: summarizeSessionWalletAddresses(session),
      walletAttachments: summarizeSessionWallets(session),
      walletHydrating,
      walletsReady,
      xmtpSetupPhase,
    });
  }, [
    authBroken,
    clientHydrated,
    connectedWallets,
    mode.kind,
    privyRuntime.configured,
    privyRuntime.connect,
    privyRuntime.loaded,
    privyRuntime.privyReady,
    routeConversationId,
    routeTarget,
    session,
    sessionWalletAddress,
    walletHydrating,
    walletsReady,
    xmtpSetupPhase,
    xmtpSignerWallet,
  ]);

  React.useEffect(() => {
    if (!authBroken) return;
    logMissingXmtpSigner("setup-auth-broken");
  }, [authBroken, logMissingXmtpSigner]);

  const handleEnableMessages = React.useCallback(() => {
    if (!session || !xmtpSignerWallet) {
      return;
    }

    const requestId = setupRequestRef.current + 1;
    setupRequestRef.current = requestId;
    setXmtpSetupPhase("enabling");
    setXmtpSetupError(null);

    void ensureXmtpClient(session, {
      allowRegistration: true,
      cache: xmtpClientCache,
      signerWallet: xmtpSignerWallet,
    })
      .then(({ client }) => {
        if (setupRequestRef.current !== requestId) {
          return;
        }

        const walletAddress = resolveXmtpWalletAddress(session, xmtpSignerWallet);
        if (walletAddress) setXmtpRegistrationHint(walletAddress);
        publishInboxBestEffort(typeof client.inboxId === "string" ? client.inboxId : null);
        setXmtpSetupPhase("ready");
      })
      .catch((setupError: unknown) => {
        if (setupRequestRef.current !== requestId) {
          return;
        }

        const message = getErrorMessage(setupError, "Could not set up encrypted messages.").toLowerCase();
        const rejected = message.includes("reject") || message.includes("denied") || message.includes("cancel");
        setXmtpSetupError(rejected
          ? "Signature was cancelled. Messages are not enabled yet."
          : isLikelyXmtpTabContentionError(setupError)
            ? "Chat is open in another tab."
            : getErrorMessage(setupError, "Could not set up encrypted messages."));
        setXmtpSetupPhase("error");
      });
  }, [publishInboxBestEffort, session, xmtpClientCache, xmtpSignerWallet]);

  const reconnectEthereumWallet = privyRuntime.reconnectEthereumWallet;
  const handleReconnectEthereumWallet = React.useCallback(() => {
    logMissingXmtpSigner("reconnect-ethereum-wallet-click", { force: true });
    reconnectEthereumWallet?.();
  }, [logMissingXmtpSigner, reconnectEthereumWallet]);

  React.useEffect(() => () => {
    setupRequestRef.current += 1;
  }, []);

  React.useEffect(() => {
    if (!session || walletHydrating || !xmtpSignerWallet) {
      setupRequestRef.current += 1;
      return;
    }

    const walletAddress = resolveXmtpWalletAddress(session, xmtpSignerWallet);
    if (!walletAddress) {
      setXmtpSetupPhase("needs-enablement");
      return;
    }

    const requestId = setupRequestRef.current + 1;
    setupRequestRef.current = requestId;
    setXmtpSetupPhase("checking");

    void ensureXmtpClient(session, {
      allowRegistration: false,
      cache: xmtpClientCache,
      signerWallet: xmtpSignerWallet,
    })
      .then(({ client }) => {
        if (setupRequestRef.current !== requestId) return;
        setXmtpRegistrationHint(walletAddress);
        publishInboxBestEffort(typeof client.inboxId === "string" ? client.inboxId : null);
        setXmtpSetupPhase("ready");
      })
      .catch((error: unknown) => {
        if (setupRequestRef.current !== requestId) return;
        if (error instanceof XmtpRegistrationRequiredError) {
          setXmtpSetupPhase("needs-enablement");
          return;
        }
        setXmtpSetupError(isLikelyXmtpTabContentionError(error)
          ? "Chat is open in another tab."
          : getErrorMessage(error, "Could not set up encrypted messages."));
        setXmtpSetupPhase("error");
      });
  }, [publishInboxBestEffort, session, walletHydrating, xmtpSignerWallet, xmtpClientCache]);

  return {
    authBroken,
    connect: privyRuntime.connect ?? undefined,
    handleEnableMessages,
    handleReconnectEthereumWallet,
    hasWarmXmtpClient,
    privyBusy: privyRuntime.busy,
    setXmtpSetupError,
    setXmtpSetupPhase,
    walletHydrating,
    xmtpClientCache,
    xmtpReady,
    xmtpSetupError,
    xmtpSetupPhase,
    xmtpSignerWallet,
  };
}
