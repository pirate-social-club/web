import { describe, expect, test } from "bun:test";

import { ApiError } from "@/lib/api/client";
import type {
  ApiCommunityAssistantChat,
  ApiCommunityAssistantMessage,
  ApiCommunityAssistantPolicyResponse,
} from "@/lib/api/client-api-types";
import type { SidebarCommunitySummary } from "@/lib/owned-communities";
import {
  buildCommunityAssistantConversationId,
  isCommunityAssistantConversationId,
  loadCommunityAssistantConversation,
  loadCommunityAssistantConversationMessages,
  parseCommunityAssistantConversationId,
  sendCommunityAssistantConversationAudioMessage,
  sendCommunityAssistantConversationMessage,
} from "./community-assistant-chat-client";

function createCommunity(overrides: Partial<SidebarCommunitySummary> = {}): SidebarCommunitySummary {
  return {
    avatarSrc: "media_avatar",
    communityId: "com_test",
    displayName: "Test Community",
    routeSlug: "test-community",
    updatedAt: "2026-05-24T10:00:00.000Z",
    ...overrides,
  };
}

function createPolicy(overrides: Partial<ApiCommunityAssistantPolicyResponse> = {}): ApiCommunityAssistantPolicyResponse {
  return {
    avatarRef: "assistant_avatar",
    community: "com_test",
    defaultPrompt: "Ask a question.",
    displayName: "Community Guide",
    enabled: true,
    object: "community_assistant_policy_public",
    shortBio: "Helpful local context.",
    starterPrompts: [],
    sttProvider: "elevenlabs",
    elevenLabsKeyConfigured: false,
    ttsProvider: "elevenlabs",
    ttsVoiceConfigured: false,
    voiceRepliesConfigured: false,
    voiceTranscriptionConfigured: false,
    voiceMode: "off",
    ...overrides,
  };
}

function createChat(overrides: Partial<ApiCommunityAssistantChat> = {}): ApiCommunityAssistantChat {
  return {
    community: "com_test",
    created_at: "2026-05-24T10:00:00.000Z",
    id: "asc_test",
    object: "community_assistant_chat",
    status: "active",
    title: null,
    updated_at: "2026-05-24T10:05:00.000Z",
    user: "usr_test",
    ...overrides,
  };
}

function createMessage(
  role: ApiCommunityAssistantMessage["role"],
  content: string,
  overrides: Partial<ApiCommunityAssistantMessage> = {},
): ApiCommunityAssistantMessage {
  return {
    chat: "asc_test",
    community: "com_test",
    completion_tokens: null,
    content,
    created_at: "2026-05-24T10:06:00.000Z",
    id: `msg_${role}_${content.length}`,
    model_id: null,
    object: "community_assistant_message",
    prompt_tokens: null,
    provider_message_id: null,
    role,
    source: null,
    total_tokens: null,
    user: "usr_test",
    ...overrides,
  };
}

function createApi(overrides: Partial<{
  getAssistantPolicy: () => Promise<ApiCommunityAssistantPolicyResponse>;
  listAssistantChats: () => Promise<{ object: "list"; data: ApiCommunityAssistantChat[] }>;
  getAssistantChat: () => Promise<{
    object: "community_assistant_chat_detail";
    chat: ApiCommunityAssistantChat;
    messages: ApiCommunityAssistantMessage[];
  }>;
  sendAssistantMessage: () => Promise<{
    object: "community_assistant_chat_response";
    chat: ApiCommunityAssistantChat;
    user_message: ApiCommunityAssistantMessage;
    assistant_message: ApiCommunityAssistantMessage;
  }>;
  sendAssistantAudioMessage: () => Promise<{
    object: "community_assistant_chat_response";
    chat: ApiCommunityAssistantChat;
    user_message: ApiCommunityAssistantMessage;
    assistant_message: ApiCommunityAssistantMessage;
  }>;
}> = {}) {
  const chat = createChat();
  return {
    communities: {
      getAssistantPolicy: async () => createPolicy(),
      listAssistantChats: async () => ({ object: "list" as const, data: [chat] }),
      getAssistantChat: async () => ({
        object: "community_assistant_chat_detail" as const,
        chat,
        messages: [
          createMessage("user", "Hello"),
          createMessage("assistant", "Hi"),
          createMessage("system", "hidden"),
        ],
      }),
      sendAssistantMessage: async () => ({
        object: "community_assistant_chat_response" as const,
        chat,
        user_message: createMessage("user", "Question"),
        assistant_message: createMessage("assistant", "Answer"),
      }),
      sendAssistantAudioMessage: async () => ({
        object: "community_assistant_chat_response" as const,
        chat,
        user_message: createMessage("user", "Voice question"),
        assistant_message: createMessage("assistant", "Voice answer"),
      }),
      ...overrides,
    },
  };
}

describe("community assistant chat client", () => {
  test("builds and parses community assistant conversation ids", () => {
    const conversationId = buildCommunityAssistantConversationId("com_test");

    expect(conversationId).toBe("community-assistant:com_test");
    expect(parseCommunityAssistantConversationId(conversationId)).toBe("com_test");
    expect(isCommunityAssistantConversationId(conversationId)).toBe(true);
    expect(isCommunityAssistantConversationId("bedsheet")).toBe(false);
  });

  test("loads an enabled community assistant as a chat conversation", async () => {
    const conversation = await loadCommunityAssistantConversation(createApi(), createCommunity());

    expect(conversation).toMatchObject({
      assistantKind: "community",
      avatarUrl: "assistant_avatar",
      communityId: "com_test",
      id: "community-assistant:com_test",
      preview: "Helpful local context.",
      profileHref: "/c/test-community",
      targetLabel: "Community Guide",
      title: "Test Community",
      transport: "assistant",
      voiceMode: "off",
      voiceRepliesEnabled: false,
      voiceTranscriptionEnabled: false,
    });
    expect(conversation?.updatedAt).toBe(Date.parse("2026-05-24T10:05:00.000Z"));
  });

  test("maps public voice capabilities onto community assistant conversations", async () => {
    const conversation = await loadCommunityAssistantConversation(createApi({
      getAssistantPolicy: async () => createPolicy({
        sttProvider: "elevenlabs",
        elevenLabsKeyConfigured: true,
        ttsProvider: "elevenlabs",
        ttsVoiceConfigured: true,
        voiceRepliesConfigured: true,
        voiceTranscriptionConfigured: true,
        voiceMode: "voice_replies",
      }),
    }), createCommunity());

    expect(conversation).toMatchObject({
      voiceMode: "voice_replies",
      voiceRepliesEnabled: true,
      voiceTranscriptionEnabled: true,
    });
  });

  test("treats text and voice replies as voice-reply capable", async () => {
    const conversation = await loadCommunityAssistantConversation(createApi({
      getAssistantPolicy: async () => createPolicy({
        sttProvider: "elevenlabs",
        elevenLabsKeyConfigured: true,
        ttsProvider: "elevenlabs",
        ttsVoiceConfigured: true,
        voiceRepliesConfigured: true,
        voiceTranscriptionConfigured: true,
        voiceMode: "text_and_voice_replies",
      }),
    }), createCommunity());

    expect(conversation).toMatchObject({
      voiceMode: "text_and_voice_replies",
      voiceRepliesEnabled: true,
      voiceTranscriptionEnabled: true,
    });
  });

  test("ignores disabled or missing community assistants", async () => {
    await expect(loadCommunityAssistantConversation(createApi({
      getAssistantPolicy: async () => createPolicy({ enabled: false }),
    }), createCommunity())).resolves.toBeNull();

    await expect(loadCommunityAssistantConversation(createApi({
      getAssistantPolicy: async () => {
        throw new ApiError("not_found", "missing", 404);
      },
    }), createCommunity())).resolves.toBeNull();
  });

  test("loads latest chat messages and drops system messages", async () => {
    const conversation = (await loadCommunityAssistantConversation(createApi(), createCommunity()))!;
    const result = await loadCommunityAssistantConversationMessages(createApi(), conversation);

    expect(result.chat?.id).toBe("asc_test");
    expect(result.messages).toEqual([
      expect.objectContaining({ content: "Hello", sender: "user" }),
      expect.objectContaining({ content: "Hi", sender: "peer" }),
    ]);
    expect(result.conversation.preview).toBe("Hi");
  });

  test("sends a message through the community assistant API", async () => {
    const result = await sendCommunityAssistantConversationMessage(createApi(), {
      chatId: "asc_test",
      communityId: "com_test",
      content: "Question",
      conversationId: "community-assistant:com_test",
    });

    expect(result.chat.id).toBe("asc_test");
    expect(result.messages).toEqual([
      expect.objectContaining({ content: "Question", sender: "user" }),
      expect.objectContaining({ content: "Answer", sender: "peer" }),
    ]);
  });

  test("sends an audio message through the community assistant API", async () => {
    const result = await sendCommunityAssistantConversationAudioMessage(createApi(), {
      chatId: "asc_test",
      communityId: "com_test",
      conversationId: "community-assistant:com_test",
      file: new File([new Uint8Array([1, 2, 3])], "voice.webm", { type: "audio/webm" }),
    });

    expect(result.chat.id).toBe("asc_test");
    expect(result.messages).toEqual([
      expect.objectContaining({ content: "Voice question", sender: "user" }),
      expect.objectContaining({ content: "Voice answer", sender: "peer" }),
    ]);
  });

  test("maps server-transcribed audio messages as voice records", async () => {
    const result = await sendCommunityAssistantConversationAudioMessage(createApi({
      sendAssistantAudioMessage: async () => ({
        object: "community_assistant_chat_response" as const,
        chat: createChat(),
        user_message: createMessage("user", "Gamarjoba", {
          source: {
            kind: "voice",
            provider: "elevenlabs",
            model: "scribe_v2",
            confidence: null,
            language_code: "ka",
            language_probability: 0.97,
            duration_seconds: 1.2,
            audio_mime_type: "audio/webm",
            audio_size_bytes: 1234,
            audio_retention: "not_stored",
          },
        }),
        assistant_message: createMessage("assistant", "Answer"),
      }),
    }), {
      chatId: "asc_test",
      communityId: "com_test",
      conversationId: "community-assistant:com_test",
      file: new File([new Uint8Array([1, 2, 3])], "voice.webm", { type: "audio/webm" }),
    });

    expect(result.messages[0]).toMatchObject({
      content: "Gamarjoba",
      sender: "user",
      source: {
        kind: "voice",
        transcript: "Gamarjoba",
        audioRetained: false,
      },
    });
  });
});
