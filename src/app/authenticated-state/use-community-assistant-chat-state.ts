"use client";

import * as React from "react";

import { toast } from "@/components/primitives/sonner";
import type {
  ApiCommunityAssistantChat,
  ApiCommunityAssistantMessage,
} from "@/lib/api/client-api-types";
import { isApiNotFoundError } from "@/lib/api/client";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import type { CommunityAssistantChatPolicyPreview } from "@/components/compositions/community/assistant-chat/community-assistant-chat";

function publicPolicyPreview(policy: unknown): CommunityAssistantChatPolicyPreview | null {
  if (!policy || typeof policy !== "object") {
    return null;
  }
  const record = policy as Record<string, unknown>;
  if (record.enabled !== true) {
    return null;
  }
  return {
    displayName: typeof record.displayName === "string" ? record.displayName : "Assistant",
    shortBio: typeof record.shortBio === "string" ? record.shortBio : "",
    avatarRef: typeof record.avatarRef === "string" ? record.avatarRef : null,
    defaultPrompt: typeof record.defaultPrompt === "string" ? record.defaultPrompt : "Ask this community.",
    starterPrompts: Array.isArray(record.starterPrompts)
      ? record.starterPrompts.filter((prompt): prompt is string => typeof prompt === "string" && prompt.trim().length > 0)
      : [],
  };
}

export function useCommunityAssistantChatState({
  communityId,
  enabled,
}: {
  communityId: string | null;
  enabled: boolean;
}) {
  const api = useApi();
  const [policy, setPolicy] = React.useState<CommunityAssistantChatPolicyPreview | null>(null);
  const [open, setOpen] = React.useState(false);
  const [chat, setChat] = React.useState<ApiCommunityAssistantChat | null>(null);
  const [messages, setMessages] = React.useState<ApiCommunityAssistantMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [loadingPolicy, setLoadingPolicy] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    if (!enabled || !communityId) {
      setPolicy(null);
      setOpen(false);
      setChat(null);
      setMessages([]);
      setHistoryLoaded(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoadingPolicy(true);
    setError(null);
    void api.communities.getAssistantPolicy(communityId)
      .then((nextPolicy) => {
        if (!cancelled) {
          setPolicy(publicPolicyPreview(nextPolicy));
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          if (!isApiNotFoundError(nextError)) {
            setError(getErrorMessage(nextError, "Could not load assistant."));
          }
          setPolicy(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPolicy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, communityId, enabled]);

  React.useEffect(() => {
    let cancelled = false;
    if (!open || !communityId || !policy || historyLoaded) {
      return () => {
        cancelled = true;
      };
    }

    setLoadingHistory(true);
    setError(null);
    void api.communities.listAssistantChats(communityId)
      .then(async (list) => {
        if (cancelled) return;
        const latest = list.data[0] ?? null;
        if (!latest) {
          setHistoryLoaded(true);
          return;
        }
        const detail = await api.communities.getAssistantChat(communityId, latest.id);
        if (cancelled) return;
        setChat(detail.chat);
        setMessages(detail.messages);
        setHistoryLoaded(true);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(nextError, "Could not load assistant chat."));
          setHistoryLoaded(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, chat, communityId, historyLoaded, open, policy]);

  const startNewChat = React.useCallback(() => {
    setChat(null);
    setMessages([]);
    setDraft("");
    setError(null);
    setHistoryLoaded(true);
  }, []);

  const sendMessage = React.useCallback((messageOverride?: string) => {
    if (!communityId || sending) {
      return;
    }
    const message = (messageOverride ?? draft).trim();
    if (!message) {
      return;
    }

    setSending(true);
    setError(null);
    if (!messageOverride) {
      setDraft("");
    }
    void api.communities.sendAssistantMessage(communityId, {
      message,
      chat_id: chat?.id ?? null,
    })
      .then((response) => {
        setChat(response.chat);
        setMessages((current) => [
          ...current,
          response.user_message,
          response.assistant_message,
        ]);
        setHistoryLoaded(true);
      })
      .catch((nextError: unknown) => {
        const messageText = getErrorMessage(nextError, "Could not send assistant message.");
        setError(messageText);
        toast.error(messageText);
        if (!messageOverride) {
          setDraft(message);
        }
      })
      .finally(() => {
        setSending(false);
      });
  }, [api.communities, chat?.id, communityId, draft, sending]);

  return {
    assistantAvailable: Boolean(policy),
    chat,
    draft,
    error,
    loadingHistory,
    loadingPolicy,
    messages,
    open,
    policy,
    sendMessage,
    sending,
    setDraft,
    setOpen,
    startNewChat,
  };
}
