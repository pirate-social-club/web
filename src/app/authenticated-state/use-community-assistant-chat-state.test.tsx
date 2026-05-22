import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";

import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type {
  ApiCommunityAssistantChat,
  ApiCommunityAssistantChatDetailResponse,
  ApiCommunityAssistantChatListResponse,
  ApiCommunityAssistantChatResponse,
  ApiCommunityAssistantMessage,
  ApiCommunityAssistantPublicPolicy,
} from "@/lib/api/client-api-types";

import { useCommunityAssistantChatState } from "./use-community-assistant-chat-state";

installDomGlobals();

function createChat(overrides: Partial<ApiCommunityAssistantChat> = {}): ApiCommunityAssistantChat {
  return {
    id: "asc_chat1",
    object: "community_assistant_chat",
    community: "community-1",
    user: "user-1",
    title: "Question about rules",
    status: "active",
    created_at: "2026-05-22T00:00:00.000Z",
    updated_at: "2026-05-22T00:00:00.000Z",
    ...overrides,
  };
}

function createMessage(
  role: "user" | "assistant",
  content: string,
  id: string,
): ApiCommunityAssistantMessage {
  return {
    id,
    object: "community_assistant_message",
    chat: "asc_chat1",
    community: "community-1",
    user: "user-1",
    role,
    content,
    model_id: role === "assistant" ? "mistralai/mistral-small-3.2-24b-instruct" : null,
    provider_message_id: null,
    prompt_tokens: null,
    completion_tokens: null,
    total_tokens: null,
    created_at: "2026-05-22T00:00:00.000Z",
  };
}

function installAssistantChatApiMocks() {
  const policy: ApiCommunityAssistantPublicPolicy = {
    object: "community_assistant_policy_public",
    community: "community-1",
    enabled: true,
    displayName: "Harbor Guide",
    shortBio: "Answers community questions.",
    avatarRef: null,
    defaultPrompt: "Ask about this community.",
    starterPrompts: ["What are the rules?"],
  };
  const chat = createChat();
  const calls = {
    getAssistantChat: [] as Array<{ communityId: string; chatId: string }>,
    getAssistantPolicy: [] as string[],
    listAssistantChats: [] as string[],
    sendAssistantMessage: [] as Array<{ communityId: string; body: { message: string; chat_id?: string | null } }>,
  };

  const communities = api.communities as unknown as {
    getAssistantChat: (communityId: string, chatId: string) => Promise<ApiCommunityAssistantChatDetailResponse>;
    getAssistantPolicy: (communityId: string) => Promise<ApiCommunityAssistantPublicPolicy>;
    listAssistantChats: (communityId: string) => Promise<ApiCommunityAssistantChatListResponse>;
    sendAssistantMessage: (
      communityId: string,
      body: { message: string; chat_id?: string | null },
    ) => Promise<ApiCommunityAssistantChatResponse>;
  };

  communities.getAssistantPolicy = async (communityId) => {
    calls.getAssistantPolicy.push(communityId);
    return policy;
  };
  communities.listAssistantChats = async (communityId) => {
    calls.listAssistantChats.push(communityId);
    return { object: "list", data: [] };
  };
  communities.getAssistantChat = async (communityId, chatId) => {
    calls.getAssistantChat.push({ communityId, chatId });
    return {
      object: "community_assistant_chat_detail",
      chat,
      messages: [
        createMessage("user", "What are the rules?", "asm_user1"),
        createMessage("assistant", "Be civil.", "asm_assistant1"),
      ],
    };
  };
  communities.sendAssistantMessage = async (communityId, body) => {
    calls.sendAssistantMessage.push({ communityId, body });
    return {
      object: "community_assistant_chat_response",
      chat,
      user_message: createMessage("user", body.message, "asm_user2"),
      assistant_message: createMessage("assistant", "Use the rules page.", "asm_assistant2"),
    };
  };

  return { calls };
}

describe("useCommunityAssistantChatState", () => {
  test("loads enabled assistant policy and sends a message", async () => {
    const { calls } = installAssistantChatApiMocks();
    const { result } = renderHook(() => useCommunityAssistantChatState({
      communityId: "community-1",
      enabled: true,
    }));

    await waitFor(() => expect(result.current.assistantAvailable).toBe(true));

    act(() => {
      result.current.setOpen(true);
    });
    await waitFor(() => expect(calls.listAssistantChats).toEqual(["community-1"]));

    act(() => {
      result.current.setDraft("Where should I post?");
    });
    await waitFor(() => expect(result.current.draft).toBe("Where should I post?"));
    act(() => {
      result.current.sendMessage();
    });

    await waitFor(() => expect(calls.sendAssistantMessage).toHaveLength(1));

    expect(calls.sendAssistantMessage[0]).toEqual({
      communityId: "community-1",
      body: {
        message: "Where should I post?",
        chat_id: null,
      },
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1]!.content).toBe("Use the rules page.");
  });

  test("loads the latest saved chat when opened", async () => {
    const { calls } = installAssistantChatApiMocks();
    const communities = api.communities as unknown as {
      listAssistantChats: (communityId: string) => Promise<ApiCommunityAssistantChatListResponse>;
    };
    communities.listAssistantChats = async (communityId) => {
      calls.listAssistantChats.push(communityId);
      return { object: "list", data: [createChat()] };
    };
    const { result } = renderHook(() => useCommunityAssistantChatState({
      communityId: "community-1",
      enabled: true,
    }));

    await waitFor(() => expect(result.current.assistantAvailable).toBe(true));

    act(() => {
      result.current.setOpen(true);
    });

    await waitFor(() => expect(calls.getAssistantChat).toEqual([{
      communityId: "community-1",
      chatId: "asc_chat1",
    }]));
    expect(result.current.messages.map((message) => message.content)).toEqual([
      "What are the rules?",
      "Be civil.",
    ]);
  });

  test("hides the launcher when the assistant policy is not found", async () => {
    const { calls } = installAssistantChatApiMocks();
    const communities = api.communities as unknown as {
      getAssistantPolicy: (communityId: string) => Promise<ApiCommunityAssistantPublicPolicy>;
    };
    communities.getAssistantPolicy = async (communityId) => {
      calls.getAssistantPolicy.push(communityId);
      throw new ApiError("not_found", "Not found", 404);
    };

    const { result } = renderHook(() => useCommunityAssistantChatState({
      communityId: "community-1",
      enabled: true,
    }));

    await waitFor(() => expect(result.current.loadingPolicy).toBe(false));

    expect(result.current.assistantAvailable).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
