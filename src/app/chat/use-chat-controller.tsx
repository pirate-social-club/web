"use client";

import * as React from "react";

import type { ChatPageViewProps } from "@/app/chat/chat-page-view";
import { navigate } from "@/app/router";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import type { StoredSession } from "@/lib/api/session-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";
import { useUiLocale } from "@/lib/ui-locale";
import { addLocalChatNotification } from "@/lib/notifications/chat-message-notifications";
import { usePwaInstallPrompt } from "@/lib/pwa/use-pwa-install-prompt";
import { useXmtpSetup } from "@/app/chat/use-xmtp-setup";
import {
  buildChatConversationPath,
  buildChatListPath,
  buildNewChatPath,
} from "@/lib/chat/chat-addressing";
import {
  AssistantUnavailableError,
  getAssistantConversation,
  isAssistantConversationId,
  loadAssistantConversationMessages,
  probeAssistantAvailability,
  seedAssistantWelcome,
  sendAssistantMessage,
} from "@/lib/chat/chat-assistant-client";
import {
  assistantConversationForAvailability,
  buildVisibleConversations,
  errorMessage,
  mergeTransportConversations,
  sortConversations,
  upsertConversation,
} from "@/lib/chat/chat-conversation-state";
import { ChatSetupState } from "@/components/compositions/chat/chat-route-views";
import type { ChatNavigationAdapter, ChatSurface } from "@/lib/chat/chat-navigation";
import {
  loadConversationMessages,
  loadConversations,
  openConversationTarget,
  sendMessage,
} from "@/lib/chat/chat-xmtp-client";
import {
  ensureXmtpClient,
  getAllowedConsentStates,
  isLikelyXmtpTabContentionError,
  resetXmtpClientCache,
  XmtpRegistrationRequiredError,
} from "@/lib/chat/chat-xmtp-support";
import type {
  ChatConversation,
  ChatMessageRecord,
  ChatRouteMode,
} from "@/lib/chat/chat-types";

const ASSISTANT_UNAVAILABLE_COPY = "Bedsheet could not be reached. Try again in a moment.";
const INITIAL_MESSAGE_QUERY_PARAM = "message";

type ChatSetupStateProps = React.ComponentProps<typeof ChatSetupState>;

export type UseChatControllerResult = {
  clientHydrated: boolean;
  session: StoredSession | null;
  signInSetupProps: ChatSetupStateProps;
  viewProps: ChatPageViewProps;
};

export function useChatController({
  mode,
  navigation,
  surface = "route",
}: {
  mode: ChatRouteMode;
  navigation?: ChatNavigationAdapter;
  surface?: ChatSurface;
}): UseChatControllerResult {
  const api = useApi();
  const clientHydrated = useClientHydrated();
  const session = useSession();
  const { dir, locale } = useUiLocale();
  const pwaPrompt = usePwaInstallPrompt();
  const isMobile = useIsMobile();
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
  const loadThreadRequestRef = React.useRef(0);
  const sendQueueRef = React.useRef(Promise.resolve());


  const routeConversationId = mode.kind === "conversation" ? mode.conversationId : null;
  const routeTarget = mode.kind === "target" ? mode.target : null;
  const {
    authBroken,
    connect,
    handleEnableMessages,
    handleReconnectEthereumWallet,
    hasWarmXmtpClient,
    privyBusy,
    setXmtpSetupError,
    setXmtpSetupPhase,
    walletHydrating,
    xmtpClientCache,
    xmtpReady,
    xmtpSetupError,
    xmtpSetupPhase,
    xmtpSignerWallet,
  } = useXmtpSetup({
    clientHydrated,
    mode,
    routeConversationId,
    routeTarget,
    session,
  });
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
    setConversations((current) => mergeTransportConversations(
      getAssistantConversation(),
      current.filter((item) => item.transport === "xmtp"),
    ));

    void probeAssistantAvailability()
      .then((available) => {
        if (cancelled) return;
        setAssistantAvailability(available ? "available" : "unavailable");
        setConversations((current) => mergeTransportConversations(
          getAssistantConversation(),
          current.filter((item) => item.transport === "xmtp"),
        ));
      })
      .catch(() => {
        if (cancelled) return;
        setAssistantAvailability("unavailable");
        setConversations((current) => mergeTransportConversations(
          getAssistantConversation(),
          current.filter((item) => item.transport === "xmtp"),
        ));
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

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
  }, [authBroken, setXmtpSetupError]);

  const refreshList = React.useCallback(async () => {
    if (!session) {
      setConversations([]);
      return;
    }

    const assistantConversation = assistantConversationForAvailability();
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
  }, [api, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

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
        assistantConversation,
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
  }, [api, buildAssistantClientContext, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

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

  const listVisibleConversations = buildVisibleConversations({
    conversations,
  });
  const listLoadingState = (
    listLoading && listVisibleConversations.length === 0
  ) || (
    !!session
    && assistantAvailability === "checking"
    && listVisibleConversations.length === 0
  );
  const listRefreshingState = listLoading && listVisibleConversations.length > 0;

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
      busy={privyBusy}
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

  return {
    clientHydrated,
    session,
    signInSetupProps: {
      busy: privyBusy,
      description: "Connect or sign in before starting an encrypted XMTP conversation.",
      onRetry: () => {
        connect?.();
      },
      retryLabel: "Connect",
      title: "Sign in to use messages",
    },
    viewProps: {
      activeConversation,
      activeConversationId,
      chatNavigation,
      error,
      handleCloseMobileChat,
      handleSend: (content) => {
        void handleSend(content);
      },
      initialDraft,
      isMobile,
      isMobileStandalone,
      listLoadingState,
      listRefreshingState,
      listVisibleConversations,
      mode,
      openTarget: (target) => {
        void openTarget(target);
      },
      routeBusy,
      sending,
      shouldRenderXmtpSetupState,
      showList,
      showThread,
      surface,
      threadConversation,
      threadItems,
      threadLoading,
      xmtpThreadSetupState,
    },
  };
}
