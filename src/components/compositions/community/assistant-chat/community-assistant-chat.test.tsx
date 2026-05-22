import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import * as React from "react";

import type { ApiCommunityAssistantMessage } from "@/lib/api/client-api-types";
import { CommunityAssistantChatModal } from "./community-assistant-chat";

Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: () => ({
    getPropertyValue: () => "",
  }),
});
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: globalThis.getComputedStyle,
});
Object.defineProperty(globalThis, "DocumentFragment", {
  configurable: true,
  value: function DocumentFragment() {
    return document.createDocumentFragment();
  },
});
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    matches: false,
    removeEventListener: () => undefined,
  }),
});
for (const key of [
  "CustomEvent",
  "Element",
  "Event",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "MutationObserver",
  "Node",
] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: window[key],
  });
}
Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  configurable: true,
  value: (id: number) => window.clearTimeout(id),
});
Object.defineProperty(globalThis, "NodeFilter", {
  configurable: true,
  value: {
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3,
    SHOW_ELEMENT: 1,
    SHOW_TEXT: 4,
  },
});

const { cleanup, fireEvent, render } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

function createMessage(role: "user" | "assistant", content: string): ApiCommunityAssistantMessage {
  return {
    id: `${role}-${content}`,
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

describe("CommunityAssistantChatModal", () => {
  test("renders starter prompts and sends one when selected", () => {
    const onSend = mock(() => undefined);
    const view = render(
      <CommunityAssistantChatModal
        draft=""
        messages={[]}
        onDraftChange={() => undefined}
        onNewChat={() => undefined}
        onOpenChange={() => undefined}
        onSend={onSend}
        open
        policy={{
          avatarRef: null,
          defaultPrompt: "Ask about this community.",
          displayName: "Harbor Guide",
          shortBio: "Answers community questions.",
          starterPrompts: ["What are the rules?"],
        }}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "What are the rules?" }));

    expect(onSend).toHaveBeenCalledWith("What are the rules?");
  });

  test("renders user and assistant messages", () => {
    const view = render(
      <CommunityAssistantChatModal
        draft=""
        messages={[
          createMessage("user", "Where should I post?"),
          createMessage("assistant", "Use the weekly thread."),
        ]}
        onDraftChange={() => undefined}
        onNewChat={() => undefined}
        onOpenChange={() => undefined}
        onSend={() => undefined}
        open
        policy={{
          avatarRef: null,
          defaultPrompt: "Ask about this community.",
          displayName: "Harbor Guide",
          shortBio: "Answers community questions.",
          starterPrompts: [],
        }}
      />,
    );

    expect(view.getByText("Where should I post?")).not.toBeNull();
    expect(view.getByText("Use the weekly thread.")).not.toBeNull();
  });
});
