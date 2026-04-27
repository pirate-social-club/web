"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { RouteLoadingState } from "@/app/route-loading-states";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import type { StoredSession } from "@/lib/api/session-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";
import { usePiratePrivyRuntime, usePiratePrivyWallets } from "@/components/auth/privy-provider";
import type { PirateConnectedEvmWallet } from "@/lib/auth/privy-wallet";
import { useUiLocale } from "@/lib/ui-locale";
import { cn } from "@/lib/utils";
import { addLocalChatNotification } from "@/lib/notifications/chat-message-notifications";
import { usePwaInstallPrompt } from "@/lib/pwa/use-pwa-install-prompt";
import {
  buildChatConversationPath,
  buildChatListPath,
  buildNewChatPath,
} from "./chat-addressing";
import {
  AssistantUnavailableError,
  getAssistantConversation,
  isAssistantConversationId,
  loadAssistantConversationMessages,
  probeAssistantAvailability,
  seedAssistantWelcome,
  sendAssistantMessage,
} from "./chat-assistant-client";
import {
  ConversationList,
  EmptyThread,
  NewConversationView,
  ChatSetupState,
  ThreadView,
} from "./chat-route-views";
import {
  loadConversationMessages,
  loadConversations,
  openConversationTarget,
  publishChatInboxId,
  sendMessage,
} from "./chat-xmtp-client";
import {
  ensureXmtpClient,
  getAllowedConsentStates,
  getSharedXmtpClientCache,
  getSessionWalletAddress,
  getXmtpRegistrationHint,
  isLikelyXmtpTabContentionError,
  resetXmtpClientCache,
  resolveXmtpSignerWallet,
  setXmtpRegistrationHint,
  XmtpRegistrationRequiredError,
} from "./chat-xmtp-support";
import type {
  ChatConversation,
  ChatMessageRecord,
  ChatRouteMode,
} from "./chat-types";

const INITIAL_MESSAGE_QUERY_PARAM = "message";
const ASSISTANT_UNAVAILABLE_COPY = "Bedsheet could not be reached. Try again in a moment.";

export interface ChatNavigationAdapter {
  closeMobileChat?: () => void;
  openConversation: (conversationId: string) => void;
  openList: () => void;
  openNew: () => void;
  openProfile: (href: string) => void;
}

export type ChatSurface = "route" | "widget";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function sortConversations(conversations: readonly ChatConversation[]): ChatConversation[] {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
}

function upsertConversation(
  conversations: readonly ChatConversation[],
  conversation: ChatConversation,
): ChatConversation[] {
  return sortConversations([
    conversation,
    ...conversations.filter((item) => item.id !== conversation.id),
  ]);
}

function mergeTransportConversations(
  assistantConversation: ChatConversation | null,
  xmtpConversations: readonly ChatConversation[],
): ChatConversation[] {
  return sortConversations([
    ...(assistantConversation ? [assistantConversation] : []),
    ...xmtpConversations.filter((item) => item.transport === "xmtp"),
  ]);
}

function summarizeConnectedWallets(wallets: readonly PirateConnectedEvmWallet[]) {
  return wallets.map((wallet) => ({
    address: wallet.address,
    walletClientType: wallet.walletClientType ?? null,
  }));
}

function summarizeSessionWallets(session: StoredSession | null) {
  return (session?.walletAttachments ?? []).map((wallet) => ({
    address: wallet.wallet_address ?? null,
    chainNamespace: wallet.chain_namespace ?? null,
    isPrimary: wallet.is_primary ?? null,
  }));
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
    userId: session?.user.user_id ?? null,
    primaryWalletAddress: session?.profile.primary_wallet_address ?? null,
    primaryWalletAttachmentId: session?.user.primary_wallet_attachment_id ?? null,
    walletAttachments: summarizeSessionWallets(session),
    walletsReady,
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

export function ChatPage({
  mode,
  navigation,
  surface = "route",
}: {
  mode: ChatRouteMode;
  navigation?: ChatNavigationAdapter;
  surface?: ChatSurface;
}) {
  const api = useApi();
  const clientHydrated = useClientHydrated();
  const session = useSession();
  const { dir, locale } = useUiLocale();
  const pwaPrompt = usePwaInstallPrompt();
  const privyRuntime = usePiratePrivyRuntime();
  const { connectedWallets, walletsReady } = usePiratePrivyWallets();
  const isMobile = useIsMobile();
  type XmtpSetupPhase = "checking" | "needs-enablement" | "enabling" | "ready" | "error";
  const [xmtpSetupPhase, setXmtpSetupPhase] = React.useState<XmtpSetupPhase>("checking");
  const [xmtpSetupError, setXmtpSetupError] = React.useState<string | null>(null);
  const xmtpReady = xmtpSetupPhase === "ready";
  const [assistantAvailability, setAssistantAvailability] = React.useState<"checking" | "available" | "unavailable">(
    session ? "checking" : "unavailable",
  );
  const [conversations, setConversations] = React.useState<ChatConversation[]>([]);
  const [messages, setMessages] = React.useState<Record<string, ChatMessageRecord[]>>({});
  const [activeConversation, setActiveConversation] = React.useState<ChatConversation | null>(null);
  const [listLoading, setListLoading] = React.useState(false);
  const [routeBusy, setRouteBusy] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const activeConversationIdRef = React.useRef<string | null>(null);
  const assistantAvailabilityRef = React.useRef<typeof assistantAvailability>(assistantAvailability);
  const lastMissingSignerDiagnosticRef = React.useRef<string | null>(null);
  const loadThreadRequestRef = React.useRef(0);
  const setupRequestRef = React.useRef(0);
  const sendQueueRef = React.useRef(Promise.resolve());
  const xmtpClientCache = React.useMemo(() => getSharedXmtpClientCache(), []);
  const seedAssistantConversation = surface === "widget";

  const routeConversationId = mode.kind === "conversation" ? mode.conversationId : null;
  const routeTarget = mode.kind === "target" ? mode.target : null;
  const initialDraft = React.useMemo(() => {
    if (mode.kind !== "target" || typeof window === "undefined") return undefined;
    if (mode.initialDraft !== undefined) return mode.initialDraft;
    return new URLSearchParams(window.location.search).get(INITIAL_MESSAGE_QUERY_PARAM) ?? undefined;
  }, [mode]);
  const activeConversationId = routeConversationId ?? activeConversation?.id ?? null;
  const showList = !isMobile || mode.kind === "list";
  const showThread = !isMobile || mode.kind === "conversation" || mode.kind === "target" || mode.kind === "new";
  const isMobileStandalone = isMobile && (mode.kind === "target" || mode.kind === "conversation" || mode.kind === "new");
  const isAssistantConversationRoute = mode.kind === "conversation" && isAssistantConversationId(mode.conversationId);
  const setupKey = session
    ? `${session.user.user_id}:${session.profile.primary_wallet_address ?? session.walletAttachments[0]?.wallet_address ?? "no-wallet"}`
    : null;
  const xmtpSignerWallet = React.useMemo(
    () => session ? resolveXmtpSignerWallet(session, connectedWallets) : null,
    [connectedWallets, session],
  );
  const walletHydrating = !!session && privyRuntime.configured && (!privyRuntime.privyReady || !walletsReady);
  const authBroken = !!session && !walletHydrating && !xmtpSignerWallet;
  const sessionWalletAddress = session ? getSessionWalletAddress(session) : null;
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
  const chatNavigation = React.useMemo<ChatNavigationAdapter>(() => navigation ?? {
    openConversation: (conversationId) => navigate(buildChatConversationPath(conversationId)),
    openList: () => navigate(buildChatListPath()),
    openNew: () => navigate(buildNewChatPath()),
    openProfile: (href) => navigate(href),
  }, [navigation]);

  const buildAssistantClientContext = React.useCallback(() => ({
    dir,
    locale,
    onboarding: session?.onboarding ?? null,
    pwa: {
      canPrompt: pwaPrompt.canPrompt,
      isIOS: pwaPrompt.isIOS,
      isInstalled: pwaPrompt.isInstalled,
      promptState: pwaPrompt.state.kind,
    },
    route: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/chat",
    surface: typeof window !== "undefined" && window.location.pathname.startsWith("/onboarding")
      ? "onboarding"
      : "chat",
  }), [dir, locale, pwaPrompt.canPrompt, pwaPrompt.isIOS, pwaPrompt.isInstalled, pwaPrompt.state.kind, session?.onboarding]);

  const logMissingXmtpSigner = React.useCallback((source: string, options?: { force?: boolean }) => {
    const key = JSON.stringify(missingSignerDiagnostic);
    if (!options?.force && lastMissingSignerDiagnosticRef.current === key) {
      return;
    }

    lastMissingSignerDiagnosticRef.current = key;
    const diagnostic = {
      ...missingSignerDiagnostic,
      source,
    };
    logger.debug("[chat] XMTP signer wallet unavailable", diagnostic);
  }, [missingSignerDiagnostic]);

  const publishInboxBestEffort = React.useCallback((inboxId: string | null) => {
    void publishChatInboxId(api, inboxId).catch((publishError) => {
      logger.warn("[chat] failed to publish XMTP inbox id", publishError);
    });
  }, [api]);

  React.useEffect(() => {
    logger.info("[chat] setup state", {
      authBroken,
      clientHydrated,
      connectedWalletCount: connectedWallets.length,
      hasConnect: !!privyRuntime.connect,
      hasRouteTarget: !!routeTarget,
      hasSession: !!session,
      hasXmtpSignerWallet: !!xmtpSignerWallet,
      mode: mode.kind,
      privyConfigured: privyRuntime.configured,
      privyLoaded: privyRuntime.loaded,
      privyReady: privyRuntime.privyReady,
      routeConversationId,
      walletHydrating,
      walletsReady,
      xmtpSetupPhase,
    });
  }, [
    authBroken,
    clientHydrated,
    connectedWallets.length,
    mode.kind,
    privyRuntime.configured,
    privyRuntime.connect,
    privyRuntime.loaded,
    privyRuntime.privyReady,
    routeConversationId,
    routeTarget,
    session,
    walletHydrating,
    walletsReady,
    xmtpSetupPhase,
    xmtpSignerWallet,
  ]);

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

        const walletAddress = getSessionWalletAddress(session);
        if (walletAddress) setXmtpRegistrationHint(walletAddress);
        publishInboxBestEffort(typeof client.inboxId === "string" ? client.inboxId : null);
        setXmtpSetupPhase("ready");
      })
      .catch((setupError: unknown) => {
        if (setupRequestRef.current !== requestId) {
          return;
        }

        const message = errorMessage(setupError, "Could not set up encrypted messages.").toLowerCase();
        const rejected = message.includes("reject") || message.includes("denied") || message.includes("cancel");
        setXmtpSetupError(rejected
          ? "Signature was cancelled. Messages are not enabled yet."
          : isLikelyXmtpTabContentionError(setupError)
            ? "Chat is open in another tab."
            : errorMessage(setupError, "Could not set up encrypted messages."));
        setXmtpSetupPhase("error");
      });
  }, [publishInboxBestEffort, session, xmtpClientCache, xmtpSignerWallet]);

  const handleReconnectEthereumWallet = React.useCallback(() => {
    logMissingXmtpSigner("reconnect-ethereum-wallet-click", { force: true });
    privyRuntime.reconnectEthereumWallet?.();
  }, [logMissingXmtpSigner, privyRuntime.reconnectEthereumWallet]);

  React.useEffect(() => () => {
    setupRequestRef.current += 1;
  }, []);

  React.useEffect(() => {
    if (!session || walletHydrating || !xmtpSignerWallet) {
      setupRequestRef.current += 1;
      return;
    }

    const walletAddress = getSessionWalletAddress(session);
    if (!walletAddress || !getXmtpRegistrationHint(walletAddress)) {
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
      .then(() => {
        if (setupRequestRef.current !== requestId) return;
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
          : errorMessage(error, "Could not set up encrypted messages."));
        setXmtpSetupPhase("error");
      });
  }, [session, walletHydrating, xmtpSignerWallet, xmtpClientCache]);

  React.useEffect(() => {
    if (!session) {
      setConversations([]);
      setMessages({});
      setActiveConversation(null);
      setAssistantAvailability("unavailable");
      setError(null);
      return;
    }

    let cancelled = false;
    setAssistantAvailability("checking");
    if (seedAssistantConversation) {
      setConversations((current) => mergeTransportConversations(
        getAssistantConversation(),
        current.filter((item) => item.transport === "xmtp"),
      ));
    }

    void probeAssistantAvailability()
      .then((available) => {
        if (cancelled) return;
        setAssistantAvailability(available ? "available" : "unavailable");
        setConversations((current) => mergeTransportConversations(
          available || seedAssistantConversation ? getAssistantConversation() : null,
          current.filter((item) => item.transport === "xmtp"),
        ));
        if (!available && !seedAssistantConversation) {
          setMessages((current) => Object.fromEntries(
            Object.entries(current).filter(([conversationId]) => !isAssistantConversationId(conversationId)),
          ));
          setActiveConversation((current) => current?.transport === "assistant" ? null : current);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAssistantAvailability("unavailable");
        setConversations((current) => mergeTransportConversations(
          seedAssistantConversation ? getAssistantConversation() : null,
          current.filter((item) => item.transport === "xmtp"),
        ));
      });

    return () => {
      cancelled = true;
    };
  }, [seedAssistantConversation, session]);

  React.useEffect(() => {
    if (!authBroken) {
      return;
    }

    setConversations((current) => current.filter((item) => item.transport === "assistant"));
    setMessages((current) => Object.fromEntries(
      Object.entries(current).filter(([conversationId]) => isAssistantConversationId(conversationId)),
    ));
    setActiveConversation((current) => current?.transport === "assistant" ? current : null);
    setError(null);
    setXmtpSetupError(null);
    logMissingXmtpSigner("auth-broken-after-wallet-hydration");
  }, [authBroken, logMissingXmtpSigner]);

  const refreshList = React.useCallback(async () => {
    if (!session) {
      setConversations([]);
      return;
    }

    const assistantConversation = assistantAvailability === "available" || seedAssistantConversation
      ? getAssistantConversation()
      : null;
    if (!xmtpReady || !xmtpSignerWallet) {
      setConversations(mergeTransportConversations(assistantConversation, []));
      return;
    }

    setListLoading(true);
    try {
      const next = await loadConversations(session, xmtpSignerWallet, xmtpClientCache, api);
      setConversations(mergeTransportConversations(assistantConversation, next));
      setError((current) => {
        const activeId = activeConversationIdRef.current;
        return activeId && isAssistantConversationId(activeId) ? current : null;
      });
    } catch (nextError) {
      logger.warn("[chat] failed to load conversations", nextError);
      if (nextError instanceof XmtpRegistrationRequiredError) {
        setXmtpSetupPhase("needs-enablement");
        return;
      }

      if (!activeConversationIdRef.current || !isAssistantConversationId(activeConversationIdRef.current)) {
        setError(isLikelyXmtpTabContentionError(nextError)
          ? "Chat is open in another tab."
          : errorMessage(nextError, "Could not load conversations."));
      }
    } finally {
      setListLoading(false);
    }
  }, [api, assistantAvailability, seedAssistantConversation, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

  React.useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id ?? activeConversationId;
  }, [activeConversation, activeConversationId]);

  React.useEffect(() => {
    assistantAvailabilityRef.current = assistantAvailability;
  }, [assistantAvailability]);

  const openTarget = React.useCallback(async (target: string) => {
    if (!session || !xmtpReady || !xmtpSignerWallet) {
      return;
    }

    setRouteBusy(true);
    setError(null);
    try {
      const conversation = await openConversationTarget(api, session, target, xmtpSignerWallet, xmtpClientCache);
      setActiveConversation(conversation);
      setConversations((current) => upsertConversation(current, conversation));
      chatNavigation.openConversation(conversation.id);
    } catch (nextError) {
      if (nextError instanceof XmtpRegistrationRequiredError) {
        setXmtpSetupPhase("needs-enablement");
        return;
      }

      setError(isLikelyXmtpTabContentionError(nextError)
        ? "Chat is open in another tab."
        : errorMessage(nextError, "Could not open chat."));
    } finally {
      setRouteBusy(false);
    }
  }, [api, chatNavigation, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

  const loadThread = React.useCallback(async (conversationId: string) => {
    if (!session) {
      return;
    }

    const assistantConversation = getAssistantConversation();
    if (isAssistantConversationId(conversationId)) {
      const requestId = loadThreadRequestRef.current + 1;
      loadThreadRequestRef.current = requestId;
      activeConversationIdRef.current = conversationId;
      setActiveConversation(assistantConversation);
      setConversations((current) => upsertConversation(current, assistantConversation));
      setRouteBusy(true);
      setError(null);
      try {
        const available = assistantAvailabilityRef.current === "available"
          ? true
          : await probeAssistantAvailability({ force: true });
        if (loadThreadRequestRef.current !== requestId) return;
        if (!available) {
          setAssistantAvailability("unavailable");
          if (!seedAssistantConversation) {
            setConversations((current) => current.filter((item) => !isAssistantConversationId(item.id)));
            setMessages((current) => Object.fromEntries(
              Object.entries(current).filter(([id]) => !isAssistantConversationId(id)),
            ));
            setActiveConversation(null);
          }
          throw new AssistantUnavailableError();
        }

        if (assistantAvailabilityRef.current !== "available") {
          setAssistantAvailability("available");
          setConversations((current) => upsertConversation(current, assistantConversation));
        }
        const loadedMessages = await loadAssistantConversationMessages(session, conversationId);
        if (loadThreadRequestRef.current !== requestId) return;
        const nextMessages = loadedMessages.length > 0
          ? loadedMessages
          : await seedAssistantWelcome(session, conversationId, buildAssistantClientContext(), { markRead: true });
        if (loadThreadRequestRef.current !== requestId) return;
        const refreshedConversation = getAssistantConversation();
        setActiveConversation(refreshedConversation);
        setConversations((current) => upsertConversation(current, refreshedConversation));
        setMessages((current) => ({ ...current, [conversationId]: nextMessages }));
      } catch (nextError) {
        if (loadThreadRequestRef.current !== requestId) return;
        setError(nextError instanceof AssistantUnavailableError
          ? ASSISTANT_UNAVAILABLE_COPY
          : "Could not load Bedsheet. Try again in a moment.");
      } finally {
        if (loadThreadRequestRef.current === requestId) setRouteBusy(false);
      }
      return;
    }

    if (!xmtpReady || !xmtpSignerWallet) {
      setConversations((current) => mergeTransportConversations(
        assistantAvailability === "available" ? assistantConversation : null,
        current.filter((item) => item.transport === "xmtp"),
      ));
      return;
    }

    setRouteBusy(true);
    activeConversationIdRef.current = conversationId;
    setError(null);
    try {
      const result = await loadConversationMessages(session, conversationId, xmtpSignerWallet, xmtpClientCache, api);
      if (!result.conversation) {
        setError("Conversation not found.");
        return;
      }

      setActiveConversation(result.conversation);
      setConversations((current) => upsertConversation(current, result.conversation!));
      setMessages((current) => ({ ...current, [result.conversation!.id]: result.messages }));
    } catch (nextError) {
      if (nextError instanceof XmtpRegistrationRequiredError) {
        setXmtpSetupPhase("needs-enablement");
        return;
      }

      setError(isLikelyXmtpTabContentionError(nextError)
        ? "Chat is open in another tab."
        : errorMessage(nextError, "Could not load this conversation."));
    } finally {
      setRouteBusy(false);
    }
  }, [api, buildAssistantClientContext, seedAssistantConversation, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

  React.useEffect(() => {
    void refreshList();
  }, [refreshList]);

  React.useEffect(() => {
    if (!session || !xmtpReady || !xmtpSignerWallet) return;
    let cancelled = false;
    let stream: { return?: () => Promise<unknown> | unknown } | null = null;

    void (async () => {
      try {
        const { client, module } = await ensureXmtpClient(session, {
          allowRegistration: false,
          cache: xmtpClientCache,
          signerWallet: xmtpSignerWallet,
        });
        if (cancelled || typeof client.conversations.streamAllMessages !== "function") return;

        logger.info("[chat] stream:start", {
          inboxId: typeof client?.inboxId === "string" ? client.inboxId : null,
          installationId: typeof client?.installationId === "string" ? client.installationId : null,
          topic: client?.conversations?.topic ?? null,
        });

        stream = await client.conversations.streamAllMessages({
          consentStates: getAllowedConsentStates(module),
          onValue: (message: any) => {
            const conversationId = String(message?.conversationId ?? message?.conversation?.id ?? "");
            const content = typeof message?.content === "string" && message.content.trim()
              ? message.content
              : typeof message?.fallback === "string" && message.fallback.trim()
                ? message.fallback
                : null;
            logger.info("[chat] stream:message", {
              contentPreview: content?.slice(0, 120) ?? null,
              conversationId,
              messageId: typeof message?.id === "string" ? message.id : null,
              senderInboxId: typeof message?.senderInboxId === "string" ? message.senderInboxId : null,
            });
            if (!conversationId || message?.senderInboxId === client.inboxId) return;
            addLocalChatNotification({
              conversationId,
              messageId: String(message?.id ?? `${conversationId}-${Date.now()}`),
              senderLabel: "New message",
              targetPath: buildChatConversationPath(conversationId),
              transport: "xmtp",
            });
            if (activeConversationIdRef.current === conversationId && content) {
              setMessages((current) => ({
                ...current,
                [conversationId]: [...(current[conversationId] ?? []), {
                  content,
                  conversationId,
                  createdAt: typeof message?.sentAt === "string"
                    ? new Date(message.sentAt).getTime()
                    : Date.now(),
                  id: String(message?.id ?? `stream-${conversationId}-${Date.now()}`),
                  sender: "peer" as const,
                }],
              }));
            }
            setConversations((current) => {
              const index = current.findIndex((c) => c.id === conversationId);
              if (index < 0) {
                void refreshList();
                return current;
              }
              const updated = [...current];
              updated[index] = {
                ...updated[index],
                preview: content ?? updated[index].preview,
                updatedAt: Date.now(),
              };
              return sortConversations(updated);
            });
          },
          onError: (streamError: unknown) => {
            logger.warn("[chat] stream:callback-error", streamError);
          },
        });
      } catch (streamError) {
        logger.warn("[chat] stream:error", streamError);
        // Streaming is best effort; route loads and manual sync still work.
      }
    })();

    return () => {
      cancelled = true;
      void stream?.return?.();
    };
  }, [loadThread, refreshList, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

  React.useEffect(() => {
    if (routeConversationId) {
      void loadThread(routeConversationId);
    }
    if (routeTarget && xmtpReady) {
      void openTarget(routeTarget);
    }
  }, [loadThread, openTarget, routeConversationId, routeTarget, xmtpReady]);

  const handleSend = React.useCallback(async (content: string) => {
    if (!session || !activeConversation) {
      return;
    }

    const conversation = activeConversation;
    if (conversation.transport === "xmtp" && (!xmtpReady || !xmtpSignerWallet)) {
      return;
    }
    const now = Date.now();
    const localMessage: ChatMessageRecord = {
      content,
      conversationId: conversation.id,
      createdAt: now,
      id: `local-${now}`,
      sender: "user",
    };
    setMessages((current) => ({
      ...current,
      [conversation.id]: [...(current[conversation.id] ?? []), localMessage],
    }));
    setConversations((current) => [
      { ...conversation, preview: content, updatedAt: now },
      ...current.filter((item) => item.id !== conversation.id),
    ]);
    setSending(true);
    const sendTask = sendQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const nextMessages = conversation.transport === "assistant"
            ? await sendAssistantMessage(session, conversation.id, content, buildAssistantClientContext(), { markRead: true })
            : !xmtpReady || !xmtpSignerWallet
              ? (() => { throw new Error("Encrypted messages are still starting."); })()
              : await sendMessage(session, conversation.id, content, xmtpSignerWallet, xmtpClientCache);
          const refreshedConversation = conversation.transport === "assistant"
            ? getAssistantConversation()
            : { ...conversation, preview: content, updatedAt: now };
          setMessages((current) => ({ ...current, [conversation.id]: nextMessages }));
          setConversations((current) => upsertConversation(current, refreshedConversation));
          setActiveConversation((current) => current?.id === refreshedConversation.id ? refreshedConversation : current);
        } catch (nextError) {
          setError(conversation.transport === "assistant" && nextError instanceof AssistantUnavailableError
            ? ASSISTANT_UNAVAILABLE_COPY
            : errorMessage(nextError, "Could not send message."));
        }
      });
    sendQueueRef.current = sendTask;
    void sendTask.finally(() => {
      if (sendQueueRef.current === sendTask) setSending(false);
    });
  }, [activeConversation, buildAssistantClientContext, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

  const listVisibleConversations = assistantAvailability === "checking" && !seedAssistantConversation
    ? conversations.filter((conversation) => !isAssistantConversationId(conversation.id))
    : conversations;
  const listLoadingState = (
    listLoading && listVisibleConversations.length === 0
  ) || (
    !!session
    && assistantAvailability === "checking"
    && listVisibleConversations.length === 0
  );
  const listRefreshingState = listLoading && listVisibleConversations.length > 0;

  if (!clientHydrated) {
    return <RouteLoadingState />;
  }

  if (!session) {
    return (
      <ChatSetupState
        busy={privyRuntime.busy}
        description="Connect or sign in before starting an encrypted XMTP conversation."
        onRetry={() => {
          privyRuntime.connect?.();
        }}
        retryLabel="Connect"
        title="Sign in to use messages"
      />
    );
  }

  function handleCloseMobileChat() {
    if (chatNavigation.closeMobileChat) {
      chatNavigation.closeMobileChat();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate(buildChatListPath());
  }

  // Derive thread props that are always consistent with the current route.
  // This prevents stale messages from the previous conversation flashing
  // while the next thread is loading.
  const threadKey = mode.kind === "conversation"
    ? mode.conversationId
    : mode.kind === "target"
      ? mode.target
      : "new";

  const isConversationRouteReady = mode.kind === "conversation"
    ? activeConversation?.id === mode.conversationId
    : true;
  const shouldMaskThread =
    (mode.kind === "conversation" && !isConversationRouteReady)
    || mode.kind === "target";

  const threadConversation = shouldMaskThread ? null : activeConversation;
  const threadItems = threadConversation ? messages[threadConversation.id] ?? [] : [];
  const xmtpThreadSetupState = authBroken ? (
    <ChatSetupState
      busy={privyRuntime.busy}
      description="Your wallet session expired. Reconnect it to keep messaging securely."
      onRetry={handleReconnectEthereumWallet}
      retryLabel="Reconnect wallet"
      title="Wallet disconnected"
    />
  ) : xmtpSetupPhase === "needs-enablement" ? (
    <ChatSetupState
      description="Your Ethereum wallet will ask you to sign once to create your message identity. This does not send a transaction or cost gas."
      onRetry={handleEnableMessages}
      retryLabel="Enable messages"
      title="Enable encrypted messages"
    />
  ) : xmtpSetupPhase === "enabling" ? (
    <ChatSetupState
      busy
      description="Check your wallet for a signature request."
      onRetry={() => {}}
      retryLabel="Waiting for signature..."
      title="Enable encrypted messages"
    />
  ) : xmtpSetupPhase === "error" ? (
    <ChatSetupState
      description="We couldn't prepare encrypted messages for this wallet. You can try again without leaving chat."
      error={xmtpSetupError}
      onRetry={() => {
        resetXmtpClientCache(xmtpClientCache);
        handleEnableMessages();
      }}
      retryLabel="Try again"
      title="Message setup failed"
    />
  ) : null;
  const shouldRenderXmtpSetupState = !isAssistantConversationRoute && (
    mode.kind === "new"
    || mode.kind === "target"
    || (mode.kind === "conversation" && !isAssistantConversationId(mode.conversationId))
  ) && !!xmtpThreadSetupState;
  const threadLoading = mode.kind === "conversation"
    ? (
      routeBusy
      || !isConversationRouteReady
      || (!isAssistantConversationRoute && (walletHydrating || (xmtpSetupPhase === "checking" && !hasWarmXmtpClient)))
    ) && !error
    : mode.kind === "target"
      ? !error
      : false;

  const threadContent = (
    <>
      {showList ? (
        <div className={cn("h-full min-h-0 w-full md:w-80 lg:w-96", !isMobile && "shrink-0")}>
          <ConversationList
            activeConversationId={activeConversationId}
            className={isMobile ? "border-r-0 bg-background" : undefined}
            conversations={listVisibleConversations}
            hideHeader={isMobile && mode.kind === "list"}
            loading={listLoadingState}
            refreshing={listRefreshingState}
            onNew={chatNavigation.openNew}
            onSelect={chatNavigation.openConversation}
          />
        </div>
      ) : null}
      <div className={cn("min-h-0 min-w-0 flex-1", !showThread && "hidden md:block")}>
        {mode.kind === "new" ? (
          shouldRenderXmtpSetupState ? xmtpThreadSetupState : (
          <NewConversationView
            busy={routeBusy}
            error={error}
            hideHeader={isMobileStandalone}
            onBack={chatNavigation.openList}
            onClose={isMobileStandalone ? handleCloseMobileChat : undefined}
            onSubmit={(target) => {
              void openTarget(target);
            }}
          />
          )
        ) : shouldRenderXmtpSetupState ? (
          xmtpThreadSetupState
        ) : activeConversation || mode.kind === "conversation" || mode.kind === "target" ? (
          <ThreadView
            key={threadKey}
            conversation={threadConversation}
            error={error}
            hideHeader={isMobileStandalone}
            initialDraft={initialDraft}
            items={threadItems}
            loading={threadLoading}
            onBack={chatNavigation.openList}
            onClose={isMobileStandalone ? handleCloseMobileChat : undefined}
            onOpenProfile={chatNavigation.openProfile}
            onSend={handleSend}
            sending={sending}
          />
        ) : (
          <EmptyThread onNew={chatNavigation.openNew} />
        )}
      </div>
    </>
  );

  if (isMobileStandalone) {
    const headerTitle = mode.kind === "new" ? "New message" : (activeConversation?.title ?? "Conversation");
    const headerProfileHref = mode.kind === "new" ? null : activeConversation?.profileHref ?? null;
    return (
      <div className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
        <MobilePageHeader
          onCloseClick={handleCloseMobileChat}
          onTitleClick={headerProfileHref ? () => chatNavigation.openProfile(headerProfileHref) : undefined}
          title={headerTitle}
          titleAvatarFallback={activeConversation?.title}
          titleAvatarSrc={activeConversation?.avatarUrl}
        />
        <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden bg-background pt-[calc(env(safe-area-inset-top)+4rem)] md:max-w-6xl">
          {threadContent}
        </div>
      </div>
    );
  }

  return (
    <section className={cn(
      "flex min-h-0 w-full flex-1 overflow-hidden bg-background",
      surface === "widget" && "h-full",
    )}>
      <div className={cn(
        "mx-auto flex min-h-0 w-full overflow-hidden border-border-soft bg-background",
        surface === "route" && "max-w-6xl md:rounded-[var(--radius-xl)] md:border md:shadow-sm",
        surface === "widget" && "h-full",
      )}>
        {threadContent}
      </div>
    </section>
  );
}

export function ChatListPage() {
  return <ChatPage mode={{ kind: "list" }} />;
}

export function ChatNewPage() {
  return <ChatPage mode={{ kind: "new" }} />;
}

export function ChatConversationPage({ conversationId }: { conversationId: string }) {
  return <ChatPage mode={{ kind: "conversation", conversationId }} />;
}

export function ChatTargetPage({ target }: { target: string }) {
  return <ChatPage mode={{ kind: "target", target }} />;
}
