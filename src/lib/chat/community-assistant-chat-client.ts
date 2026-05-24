"use client";

import type {
  ApiCommunityAssistantChat,
  ApiCommunityAssistantChatDetailResponse,
  ApiCommunityAssistantChatListResponse,
  ApiCommunityAssistantChatResponse,
  ApiCommunityAssistantMessage,
  ApiCommunityAssistantPolicyResponse,
} from "@/lib/api/client-api-types";
import { isApiNotFoundError } from "@/lib/api/client";
import type { SidebarCommunitySummary } from "@/lib/owned-communities";
import type { ChatConversation, ChatMessageRecord } from "./chat-types";

const COMMUNITY_ASSISTANT_CONVERSATION_PREFIX = "community-assistant:";
const COMMUNITY_ASSISTANT_DEFAULT_PREVIEW = "Ask this community";

type CommunityAssistantApi = {
  communities: {
    getAssistantChat: (
      communityId: string,
      chatId: string,
    ) => Promise<ApiCommunityAssistantChatDetailResponse>;
    getAssistantPolicy: (communityId: string) => Promise<ApiCommunityAssistantPolicyResponse>;
    listAssistantChats: (communityId: string) => Promise<ApiCommunityAssistantChatListResponse>;
    sendAssistantMessage: (
      communityId: string,
      body: { message: string; chat_id?: string | null },
    ) => Promise<ApiCommunityAssistantChatResponse>;
  };
};

export type CommunityAssistantConversationLoadResult = {
  chat: ApiCommunityAssistantChat | null;
  conversation: ChatConversation;
  messages: ChatMessageRecord[];
};

function parseTimestamp(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function publicPolicyPreview(policy: ApiCommunityAssistantPolicyResponse): {
  avatarRef: string | null;
  defaultPrompt: string;
  displayName: string;
  enabled: boolean;
  shortBio: string;
} | null {
  if (!policy || typeof policy !== "object" || policy.enabled !== true) {
    return null;
  }

  return {
    avatarRef: typeof policy.avatarRef === "string" ? policy.avatarRef : null,
    defaultPrompt: typeof policy.defaultPrompt === "string" ? policy.defaultPrompt : "",
    displayName: typeof policy.displayName === "string" && policy.displayName.trim()
      ? policy.displayName.trim()
      : "Assistant",
    enabled: true,
    shortBio: typeof policy.shortBio === "string" ? policy.shortBio : "",
  };
}

function messageToRecord(
  message: ApiCommunityAssistantMessage,
  conversationId: string,
): ChatMessageRecord | null {
  const sender = message.role === "user"
    ? "user"
    : message.role === "assistant"
      ? "peer"
      : null;
  if (sender === null) return null;

  return {
    content: message.content,
    conversationId,
    createdAt: parseTimestamp(message.created_at) || Date.now(),
    id: message.id,
    sender,
  };
}

function getLatestMessagePreview(messages: readonly ChatMessageRecord[]): string | null {
  const latest = messages[messages.length - 1];
  const content = latest?.content.trim();
  return content || null;
}

function getConversationPreview(input: {
  defaultPrompt: string;
  messages?: readonly ChatMessageRecord[];
  shortBio: string;
}): string {
  const latestPreview = input.messages ? getLatestMessagePreview(input.messages) : null;
  return latestPreview
    || input.shortBio.trim()
    || input.defaultPrompt.trim()
    || COMMUNITY_ASSISTANT_DEFAULT_PREVIEW;
}

function buildProfileHref(community: Pick<SidebarCommunitySummary, "communityId" | "routeSlug">): string {
  return `/c/${encodeURIComponent(community.routeSlug?.trim() || community.communityId)}`;
}

function buildConversation(input: {
  community: Pick<SidebarCommunitySummary, "avatarSrc" | "communityId" | "displayName" | "routeSlug" | "updatedAt">;
  latestChat: ApiCommunityAssistantChat | null;
  messages?: readonly ChatMessageRecord[];
  policy: NonNullable<ReturnType<typeof publicPolicyPreview>>;
}): ChatConversation {
  const updatedAt = input.latestChat
    ? parseTimestamp(input.latestChat.updated_at)
    : parseTimestamp(input.community.updatedAt);
  return {
    assistantKind: "community",
    avatarSeed: `community-assistant-${input.community.communityId}`,
    avatarUrl: input.policy.avatarRef ?? input.community.avatarSrc ?? undefined,
    communityId: input.community.communityId,
    id: buildCommunityAssistantConversationId(input.community.communityId),
    preview: getConversationPreview({
      defaultPrompt: input.policy.defaultPrompt,
      messages: input.messages,
      shortBio: input.policy.shortBio,
    }),
    profileHref: buildProfileHref(input.community),
    targetLabel: input.policy.displayName,
    title: input.community.displayName || input.policy.displayName,
    transport: "assistant",
    unreadCount: 0,
    updatedAt,
  };
}

async function ignoreNotFound<T>(task: Promise<T>): Promise<T | null> {
  try {
    return await task;
  } catch (error) {
    if (isApiNotFoundError(error)) return null;
    throw error;
  }
}

export function buildCommunityAssistantConversationId(communityId: string): string {
  return `${COMMUNITY_ASSISTANT_CONVERSATION_PREFIX}${communityId}`;
}

export function parseCommunityAssistantConversationId(conversationId: string): string | null {
  if (!conversationId.startsWith(COMMUNITY_ASSISTANT_CONVERSATION_PREFIX)) {
    return null;
  }
  const communityId = conversationId.slice(COMMUNITY_ASSISTANT_CONVERSATION_PREFIX.length).trim();
  return communityId || null;
}

export function isCommunityAssistantConversationId(conversationId: string): boolean {
  return parseCommunityAssistantConversationId(conversationId) !== null;
}

export async function loadCommunityAssistantConversation(
  api: CommunityAssistantApi,
  community: Pick<SidebarCommunitySummary, "avatarSrc" | "communityId" | "displayName" | "routeSlug" | "updatedAt">,
): Promise<ChatConversation | null> {
  const policyResponse = await ignoreNotFound(api.communities.getAssistantPolicy(community.communityId));
  if (!policyResponse) return null;

  const policy = publicPolicyPreview(policyResponse);
  if (!policy) return null;

  const chatList = await ignoreNotFound(api.communities.listAssistantChats(community.communityId));
  const latestChat = chatList?.data[0] ?? null;
  return buildConversation({ community, latestChat, policy });
}

export async function loadCommunityAssistantConversations(
  api: CommunityAssistantApi,
  communities: readonly SidebarCommunitySummary[],
): Promise<ChatConversation[]> {
  const results = await Promise.all(
    communities.map((community) => loadCommunityAssistantConversation(api, community)),
  );
  return results.filter((conversation): conversation is ChatConversation => conversation !== null);
}

export async function loadCommunityAssistantConversationMessages(
  api: CommunityAssistantApi,
  conversation: ChatConversation,
): Promise<CommunityAssistantConversationLoadResult> {
  if (!conversation.communityId) {
    throw new Error("Community assistant conversation is missing a community id.");
  }

  const policyResponse = await api.communities.getAssistantPolicy(conversation.communityId);
  const policy = publicPolicyPreview(policyResponse);
  if (!policy) {
    throw new Error("Community assistant is not available.");
  }

  const chatList = await api.communities.listAssistantChats(conversation.communityId);
  const latestChat = chatList.data[0] ?? null;
  if (!latestChat) {
    return {
      chat: null,
      conversation: buildConversation({
        community: {
          avatarSrc: conversation.avatarUrl,
          communityId: conversation.communityId,
          displayName: conversation.title,
          routeSlug: null,
          updatedAt: conversation.updatedAt,
        },
        latestChat: null,
        policy,
      }),
      messages: [],
    };
  }

  const detail = await api.communities.getAssistantChat(conversation.communityId, latestChat.id);
  const messages = detail.messages
    .map((message) => messageToRecord(message, conversation.id))
    .filter((message): message is ChatMessageRecord => message !== null);
  return {
    chat: detail.chat,
    conversation: buildConversation({
      community: {
        avatarSrc: conversation.avatarUrl,
        communityId: conversation.communityId,
        displayName: conversation.title,
        routeSlug: null,
        updatedAt: conversation.updatedAt,
      },
      latestChat: detail.chat,
      messages,
      policy,
    }),
    messages,
  };
}

export async function sendCommunityAssistantConversationMessage(
  api: CommunityAssistantApi,
  input: {
    chatId: string | null;
    communityId: string;
    content: string;
    conversationId: string;
  },
): Promise<{
  chat: ApiCommunityAssistantChat;
  messages: ChatMessageRecord[];
}> {
  const response = await api.communities.sendAssistantMessage(input.communityId, {
    chat_id: input.chatId,
    message: input.content,
  });
  return {
    chat: response.chat,
    messages: [response.user_message, response.assistant_message]
      .map((message) => messageToRecord(message, input.conversationId))
      .filter((message): message is ChatMessageRecord => message !== null),
  };
}
