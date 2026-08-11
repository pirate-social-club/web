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
import { useRouteMessages } from "@/hooks/use-route-messages";
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
  isBedsheetAssistantConversationId,
  loadAssistantConversationMessages,
  probeAssistantAvailability,
  seedAssistantWelcome,
  sendAssistantMessage,
} from "@/lib/chat/chat-assistant-client";
import {
  isCommunityAssistantConversationId,
  loadCommunityAssistantConversation,
  loadCommunityAssistantConversationMessages,
  loadCommunityAssistantConversations,
  parseCommunityAssistantConversationId,
  sendCommunityAssistantConversationAudioMessage,
  sendCommunityAssistantConversationMessage,
} from "@/lib/chat/community-assistant-chat-client";
import {
  buildVisibleConversations,
  mergeTransportConversations,
  sortConversations,
  upsertConversation,
} from "@/lib/chat/chat-conversation-state";
import { getErrorMessage } from "@/lib/error-utils";
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
  type XmtpMessage,
} from "@/lib/chat/chat-xmtp-support";
import type {
  ChatConversation,
  ChatMessageRecord,
  ChatRouteMode,
} from "@/lib/chat/chat-types";
import { useSidebarCommunities } from "@/lib/owned-communities";

const INITIAL_MESSAGE_QUERY_PARAM = "message";

type ChatSetupStateProps = React.ComponentProps<typeof ChatSetupState>;

function isAssistantTransportConversationId(conversationId: string): boolean {
  return isBedsheetAssistantConversationId(conversationId)
    || isCommunityAssistantConversationId(conversationId);
}

function parseApiTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
  const { recentCommunities } = useSidebarCommunities();
  const { dir, locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const chat = copy.chat;
  const pwaPrompt = usePwaInstallPrompt();
  const isMobile = useIsMobile();
  const [assistantAvailability, setAssistantAvailability] = React.useState<"checking" | "available" | "unavailable">(
    session ? "checking" : "unavailable",
  );
  const [conversations, setConversations] = React.useState<ChatConversation[]>([]);
  const [communityAssistantConversations, setCommunityAssistantConversations] = React.useState<ChatConversation[]>([]);
  const [messages, setMessages] = React.useState<Record<string, ChatMessageRecord[]>>({});
  const [activeConversation, setActiveConversation] = React.useState<ChatConversation | null>(null);
  const [listLoading, setListLoading] = React.useState(false);
  const [routeBusy, setRouteBusy] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const activeConversationIdRef = React.useRef<string | null>(null);
  const assistantAvailabilityRef = React.useRef<typeof assistantAvailability>(assistantAvailability);
  const communityAssistantChatIdsRef = React.useRef<Record<string, string | null>>({});
  const communityAssistantConversationsRef = React.useRef<ChatConversation[]>([]);
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
  const isAssistantConversationRoute = mode.kind === "conversation"
    && isAssistantTransportConversationId(mode.conversationId);
  const chatNavigation = React.useMemo<ChatNavigationAdapter>(() => navigation ?? {
    openConversation: (conversationId) => navigate(buildChatConversationPath(conversationId)),
    openList: () => navigate(buildChatListPath()),
    openNew: () => navigate(buildNewChatPath()),
    openProfile: (href) => navigate(href),
  }, [navigation]);
  const getAssistantConversations = React.useCallback((): ChatConversation[] => [
    getAssistantConversation(),
    ...communityAssistantConversationsRef.current,
  ], []);

  React.useEffect(() => {
    communityAssistantConversationsRef.current = communityAssistantConversations;
  }, [communityAssistantConversations]);

  React.useEffect(() => {
    logger.info("[chat:controller] state", {
      activeConversationId,
      assistantAvailability,
      authBroken,
      conversationCount: conversations.length,
      error,
      hasSession: !!session,
      hasWarmXmtpClient,
      hasXmtpSignerWallet: !!xmtpSignerWallet,
      listLoading,
      mode: mode.kind,
      routeConversationId,
      routeTarget,
      routeBusy,
      surface,
      walletHydrating,
      xmtpReady,
      xmtpSetupError,
      xmtpSetupPhase,
    });
  }, [
    activeConversationId,
    assistantAvailability,
    authBroken,
    conversations.length,
    error,
    hasWarmXmtpClient,
    listLoading,
    mode.kind,
    routeBusy,
    routeConversationId,
    routeTarget,
    session,
    surface,
    walletHydrating,
    xmtpReady,
    xmtpSetupError,
    xmtpSetupPhase,
    xmtpSignerWallet,
  ]);

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
      setCommunityAssistantConversations([]);
      communityAssistantChatIdsRef.current = {};
      setMessages({});
      setActiveConversation(null);
      setAssistantAvailability("unavailable");
      setError(null);
      return;
    }

    let cancelled = false;
    setAssistantAvailability("checking");
    setConversations((current) => mergeTransportConversations(
      getAssistantConversations(),
      current.filter((item) => item.transport === "xmtp"),
    ));

    void probeAssistantAvailability()
      .then((available) => {
        if (cancelled) return;
        setAssistantAvailability(available ? "available" : "unavailable");
        setConversations((current) => mergeTransportConversations(
          getAssistantConversations(),
          current.filter((item) => item.transport === "xmtp"),
        ));
      })
      .catch(() => {
        if (cancelled) return;
        setAssistantAvailability("unavailable");
        setConversations((current) => mergeTransportConversations(
          getAssistantConversations(),
          current.filter((item) => item.transport === "xmtp"),
        ));
      });

    return () => {
      cancelled = true;
    };
  }, [getAssistantConversations, session]);

  const communityAssistantCandidateKey = React.useMemo(
    () => recentCommunities.map((community) => community.communityId).join("|"),
    [recentCommunities],
  );

  React.useEffect(() => {
    if (!session) {
      setCommunityAssistantConversations([]);
      communityAssistantConversationsRef.current = [];
      setConversations([]);
      return;
    }

    if (recentCommunities.length === 0) {
      setCommunityAssistantConversations([]);
      communityAssistantConversationsRef.current = [];
      setConversations((current) => mergeTransportConversations(
        getAssistantConversation(),
        current.filter((item) => item.transport === "xmtp"),
      ));
      return;
    }

    let cancelled = false;
    void loadCommunityAssistantConversations(api, recentCommunities)
      .then((nextConversations) => {
        if (cancelled) return;
        setCommunityAssistantConversations(nextConversations);
        communityAssistantConversationsRef.current = nextConversations;
        setConversations((current) => mergeTransportConversations(
          [getAssistantConversation(), ...nextConversations],
          current.filter((item) => item.transport === "xmtp"),
        ));
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        logger.warn("[chat] failed to load community assistants", nextError);
        setCommunityAssistantConversations([]);
        communityAssistantConversationsRef.current = [];
        setConversations((current) => mergeTransportConversations(
          getAssistantConversation(),
          current.filter((item) => item.transport === "xmtp"),
        ));
      });

    return () => {
      cancelled = true;
    };
  }, [api, communityAssistantCandidateKey, recentCommunities, session]);

  React.useEffect(() => {
    if (!authBroken) {
      return;
    }

    setConversations((current) => current.filter((item) => item.transport === "assistant"));
    setMessages((current) => Object.fromEntries(
      Object.entries(current).filter(([conversationId]) => isAssistantTransportConversationId(conversationId)),
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

    const assistantConversations = getAssistantConversations();
    if (!xmtpReady || !xmtpSignerWallet) {
      setConversations(mergeTransportConversations(assistantConversations, []));
      return;
    }

    setListLoading(true);
    try {
      const next = await loadConversations(session, xmtpSignerWallet, xmtpClientCache, api);
      setConversations(mergeTransportConversations(getAssistantConversations(), next));
      setError((current) => {
        const activeId = activeConversationIdRef.current;
        return activeId && isAssistantTransportConversationId(activeId) ? current : null;
      });
    } catch (nextError) {
      logger.warn("[chat] failed to load conversations", nextError);
      if (nextError instanceof XmtpRegistrationRequiredError) {
        setXmtpSetupPhase("needs-enablement");
        return;
      }

      if (!activeConversationIdRef.current || !isAssistantTransportConversationId(activeConversationIdRef.current)) {
        setError(isLikelyXmtpTabContentionError(nextError)
          ? chat.errorChatInAnotherTab
          : getErrorMessage(nextError, chat.couldNotLoadConversations));
      }
    } finally {
      setListLoading(false);
    }
  }, [api, chat.couldNotLoadConversations, chat.errorChatInAnotherTab, getAssistantConversations, session, setXmtpSetupPhase, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

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
        ? chat.errorChatInAnotherTab
        : getErrorMessage(nextError, chat.couldNotOpenChat));
    } finally {
      setRouteBusy(false);
    }
  }, [api, chat.couldNotOpenChat, chat.errorChatInAnotherTab, chatNavigation, session, setXmtpSetupPhase, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

  const loadThread = React.useCallback(async (conversationId: string) => {
    if (!session) {
      return;
    }

    const communityAssistantCommunityId = parseCommunityAssistantConversationId(conversationId);
    if (communityAssistantCommunityId) {
      const requestId = loadThreadRequestRef.current + 1;
      loadThreadRequestRef.current = requestId;
      activeConversationIdRef.current = conversationId;
      setRouteBusy(true);
      setError(null);
      try {
        const existingConversation = communityAssistantConversationsRef.current.find(
          (conversation) => conversation.id === conversationId,
        ) ?? null;
        const community = recentCommunities.find(
          (candidate) => candidate.communityId === communityAssistantCommunityId,
        ) ?? {
          avatarSrc: null,
          communityId: communityAssistantCommunityId,
          displayName: communityAssistantCommunityId,
          routeSlug: null,
          updatedAt: 0,
        };
        const assistantConversation = existingConversation
          ?? await loadCommunityAssistantConversation(api, community);
        if (loadThreadRequestRef.current !== requestId) return;
        if (!assistantConversation) {
          throw new Error("Community assistant is not available.");
        }

        setActiveConversation(assistantConversation);
        setConversations((current) => upsertConversation(current, assistantConversation));
        const result = await loadCommunityAssistantConversationMessages(api, assistantConversation);
        if (loadThreadRequestRef.current !== requestId) return;
        communityAssistantChatIdsRef.current[conversationId] = result.chat?.id ?? null;
        setActiveConversation(result.conversation);
        setCommunityAssistantConversations((current) => upsertConversation(current, result.conversation));
        communityAssistantConversationsRef.current = upsertConversation(
          communityAssistantConversationsRef.current,
          result.conversation,
        );
        setConversations((current) => upsertConversation(current, result.conversation));
        setMessages((current) => ({ ...current, [conversationId]: result.messages }));
      } catch (nextError) {
        if (loadThreadRequestRef.current !== requestId) return;
        setError(getErrorMessage(nextError, chat.couldNotLoadConversation));
      } finally {
        if (loadThreadRequestRef.current === requestId) setRouteBusy(false);
      }
      return;
    }

    const assistantConversation = getAssistantConversation();
    if (isBedsheetAssistantConversationId(conversationId)) {
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
          ? chat.couldNotLoadBedsheet
          : chat.couldNotLoadBedsheet);
      } finally {
        if (loadThreadRequestRef.current === requestId) setRouteBusy(false);
      }
      return;
    }

    if (!xmtpReady || !xmtpSignerWallet) {
      setConversations((current) => mergeTransportConversations(
        getAssistantConversations(),
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
        setError(chat.conversationNotFound);
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
        ? chat.errorChatInAnotherTab
        : getErrorMessage(nextError, chat.couldNotLoadConversation));
    } finally {
      setRouteBusy(false);
    }
  }, [api, buildAssistantClientContext, chat.conversationNotFound, chat.couldNotLoadBedsheet, chat.couldNotLoadConversation, chat.errorChatInAnotherTab, getAssistantConversations, recentCommunities, session, setXmtpSetupPhase, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

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
          onValue: (message: XmtpMessage) => {
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
              senderLabel: chat.notificationNewMessage,
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
  }, [chat.notificationNewMessage, loadThread, refreshList, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

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
          let refreshedConversation: ChatConversation;
          if (conversation.assistantKind === "community" && conversation.communityId) {
            const result = await sendCommunityAssistantConversationMessage(api, {
              chatId: communityAssistantChatIdsRef.current[conversation.id] ?? null,
              communityId: conversation.communityId,
              content,
              conversationId: conversation.id,
            });
            communityAssistantChatIdsRef.current[conversation.id] = result.chat.id;
            refreshedConversation = {
              ...conversation,
              preview: result.messages[result.messages.length - 1]?.content ?? content,
              updatedAt: parseApiTimestamp(result.chat.updated_at) || now,
            };
            setMessages((current) => ({
              ...current,
              [conversation.id]: [
                ...(current[conversation.id] ?? []).filter((message) => message.id !== localMessage.id),
                ...result.messages,
              ],
            }));
            setCommunityAssistantConversations((current) => upsertConversation(current, refreshedConversation));
            communityAssistantConversationsRef.current = upsertConversation(
              communityAssistantConversationsRef.current,
              refreshedConversation,
            );
          } else {
            const nextMessages = conversation.transport === "assistant"
              ? await sendAssistantMessage(session, conversation.id, content, buildAssistantClientContext(), { markRead: true })
              : !xmtpReady || !xmtpSignerWallet
                ? (() => { throw new Error("Encrypted messages are still starting."); })()
                : await sendMessage(session, conversation.id, content, xmtpSignerWallet, xmtpClientCache);
            refreshedConversation = conversation.transport === "assistant"
              ? getAssistantConversation()
              : { ...conversation, preview: content, updatedAt: now };
            setMessages((current) => ({ ...current, [conversation.id]: nextMessages }));
          }
          setConversations((current) => upsertConversation(current, refreshedConversation));
          setActiveConversation((current) => current?.id === refreshedConversation.id ? refreshedConversation : current);
        } catch (nextError) {
          setError(conversation.transport === "assistant" && nextError instanceof AssistantUnavailableError
            ? chat.couldNotLoadBedsheet
            : getErrorMessage(nextError, chat.couldNotSendMessage));
        }
      });
    sendQueueRef.current = sendTask;
    void sendTask.finally(() => {
      if (sendQueueRef.current === sendTask) setSending(false);
    });
  }, [activeConversation, api, buildAssistantClientContext, chat.couldNotLoadBedsheet, chat.couldNotSendMessage, session, xmtpClientCache, xmtpReady, xmtpSignerWallet]);

  const handleSendAudio = React.useCallback(async (file: File): Promise<void> => {
    const conversation = activeConversation;
    if (!session || !conversation?.communityId || conversation.assistantKind !== "community") {
      throw new Error("Community assistant voice is not available.");
    }
    setSending(true);
    const now = Date.now();
    const sendTask = sendQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const result = await sendCommunityAssistantConversationAudioMessage(api, {
            chatId: communityAssistantChatIdsRef.current[conversation.id] ?? null,
            communityId: conversation.communityId!,
            conversationId: conversation.id,
            file,
          });
          communityAssistantChatIdsRef.current[conversation.id] = result.chat.id;
          const refreshedConversation: ChatConversation = {
            ...conversation,
            preview: result.messages[result.messages.length - 1]?.content ?? conversation.preview,
            updatedAt: parseApiTimestamp(result.chat.updated_at) || now,
          };
          setMessages((current) => ({
            ...current,
            [conversation.id]: [
              ...(current[conversation.id] ?? []),
              ...result.messages,
            ],
          }));
          setCommunityAssistantConversations((current) => upsertConversation(current, refreshedConversation));
          communityAssistantConversationsRef.current = upsertConversation(
            communityAssistantConversationsRef.current,
            refreshedConversation,
          );
          setConversations((current) => upsertConversation(current, refreshedConversation));
          setActiveConversation((current) => current?.id === refreshedConversation.id ? refreshedConversation : current);
        } catch (nextError) {
          setError(getErrorMessage(nextError, "Could not send voice message."));
          throw nextError;
        }
      });
    sendQueueRef.current = sendTask;
    await sendTask.finally(() => {
      if (sendQueueRef.current === sendTask) setSending(false);
    });
  }, [activeConversation, api, session]);

  const handleSynthesizeSpeech = React.useCallback(async (text: string): Promise<Blob> => {
    const conversation = activeConversation;
    if (!session || !conversation?.communityId || conversation.assistantKind !== "community") {
      throw new Error("Community assistant voice replies are not available.");
    }
    const response = await api.communities.synthesizeAssistantSpeech(conversation.communityId, { text });
    return response.blob();
  }, [activeConversation, api, session]);

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
  const compactSetupState = surface === "widget";
  const xmtpThreadSetupState = authBroken ? (
    <ChatSetupState
      busy={privyBusy}
      compact={compactSetupState}
      description={chat.setupWalletAvailableDescription}
      onRetry={handleReconnectEthereumWallet}
      presentation="signature"
      retryLabel={chat.setupContinueWithWalletAction}
      title={chat.setupSignTitle}
    />
  ) : xmtpSetupPhase === "needs-enablement" ? (
    <ChatSetupState
      compact={compactSetupState}
      description={chat.setupConfirmWalletDescription}
      onRetry={handleEnableMessages}
      presentation="signature"
      retryLabel={chat.setupSignAction}
      title={chat.setupSignTitle}
    />
  ) : xmtpSetupPhase === "enabling" ? (
    <ChatSetupState
      busy
      compact={compactSetupState}
      description={chat.setupCheckWalletDescription}
      onRetry={() => {}}
      presentation="signature"
      retryLabel={chat.setupWaitingForSignatureAction}
      title={chat.setupSignTitle}
    />
  ) : xmtpSetupPhase === "error" ? (
    <ChatSetupState
      description={chat.setupFailedDescription}
      error={xmtpSetupError}
      onRetry={() => {
        resetXmtpClientCache(xmtpClientCache);
        handleEnableMessages();
      }}
      retryLabel={chat.setupTryAgainAction}
      title={chat.setupFailedTitle}
    />
  ) : null;
  const shouldRenderXmtpSetupState = !isAssistantConversationRoute && (
    mode.kind === "list"
    || mode.kind === "new"
    || mode.kind === "target"
    || (mode.kind === "conversation" && !isAssistantTransportConversationId(mode.conversationId))
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
      compact: compactSetupState,
      description: chat.setupSignInDescription,
      onRetry: () => {
        connect?.();
      },
      retryLabel: chat.connectAction,
      title: chat.setupSignInTitle,
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
      handleSendAudio,
      handleSynthesizeSpeech,
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
