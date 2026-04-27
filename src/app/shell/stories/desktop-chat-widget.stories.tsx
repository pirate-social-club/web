import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import bedsheetAvatarUrl from "@/assets/logo_ghost_sm.png";
import { AppHeader } from "@/components/compositions/app/app-shell-chrome/app-header";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import type { ChatConversation, ChatMessageRecord } from "@/app/authenticated-routes/chat/chat-types";
import {
  ConversationList,
  EmptyThread,
  NewConversationView,
  ThreadView,
} from "@/app/authenticated-routes/chat/chat-route-views";

import { DesktopChatWidgetFrame } from "../desktop-chat-widget";

const now = new Date("2026-04-26T15:30:00Z").getTime();

const conversations: ChatConversation[] = [
  {
    id: "xmtp-conversation-1",
    peerAddress: "0x1234567890abcdef1234567890abcdef12345678",
    preview: "That works. I can send the namespace notes in a minute.",
    profileHref: "/u/marina.pirate",
    targetLabel: "marina.pirate",
    title: "Marina",
    transport: "xmtp",
    unreadCount: 2,
    updatedAt: now,
  },
  {
    id: "xmtp-conversation-2",
    peerAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    preview: "Following up from the profile page.",
    targetLabel: "atlas.eth",
    title: "atlas.eth",
    transport: "xmtp",
    unreadCount: 0,
    updatedAt: now - 1000 * 60 * 24,
  },
  {
    assistantKind: "bedsheet",
    avatarUrl: bedsheetAvatarUrl,
    id: "bedsheet",
    preview: "Ask Bedsheet about Pirate",
    profileHref: "/u/bedsheet.pirate",
    targetLabel: "bedsheet.pirate",
    title: "Bedsheet",
    transport: "assistant",
    unreadCount: 0,
    updatedAt: now - 1000 * 60 * 95,
  },
];

const messages: ChatMessageRecord[] = [
  {
    content: "Can you send over the community namespace notes?",
    conversationId: "xmtp-conversation-1",
    createdAt: now - 1000 * 60 * 18,
    id: "message-1",
    sender: "user",
  },
  {
    content: "Yes. I am checking the profile routing first.",
    conversationId: "xmtp-conversation-1",
    createdAt: now - 1000 * 60 * 15,
    id: "message-2",
    sender: "peer",
  },
  {
    content: "That works. I can send the namespace notes in a minute.",
    conversationId: "xmtp-conversation-1",
    createdAt: now - 1000 * 60 * 5,
    id: "message-3",
    sender: "peer",
  },
];

type WidgetView =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "thread"; conversationId: string };

function ChatWidgetStoryContent() {
  const [open, setOpen] = React.useState(true);
  const [view, setView] = React.useState<WidgetView>({ kind: "thread", conversationId: conversations[0].id });
  const activeConversation = view.kind === "thread"
    ? conversations.find((conversation) => conversation.id === view.conversationId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-muted p-6 text-foreground">
      <AppHeader
        hideMobileBrand
        labels={{ chatAriaLabel: "Chats", createLabel: "Create", homeAriaLabel: "Home" }}
        onChatClick={() => {
          setView({ kind: "thread", conversationId: conversations[0].id });
          setOpen((current) => !current);
        }}
        onCreateClick={() => {}}
        onHomeClick={() => {}}
        onNotificationsClick={() => {}}
        onProfileClick={() => {}}
        showChatAction
        showCreateAction
        showNotificationsAction
        showProfileAction
      />
      <div className="max-w-2xl space-y-4 pt-8">
        <Type as="h1" variant="h2">Community feed</Type>
        <Type as="p" className="text-muted-foreground" variant="body">
          Recent posts and conversations from your communities.
        </Type>
        {!open ? <Button onClick={() => setOpen(true)}>Open chats</Button> : null}
      </div>

      {open ? (
        <DesktopChatWidgetFrame onClose={() => setOpen(false)}>
          <div className="flex h-full min-h-0">
            <div className="h-full min-h-0 w-80 shrink-0">
              <ConversationList
                activeConversationId={activeConversation?.id}
                conversations={conversations}
                loading={false}
                onNew={() => setView({ kind: "new" })}
                onSelect={(conversationId) => setView({ kind: "thread", conversationId })}
              />
            </div>
            <div className="min-h-0 min-w-0 flex-1">
              {view.kind === "new" ? (
                <NewConversationView
                  busy={false}
                  onBack={() => setView({ kind: "list" })}
                  onClose={() => setOpen(false)}
                  onSubmit={() => setView({ kind: "thread", conversationId: conversations[0].id })}
                />
              ) : activeConversation ? (
                <ThreadView
                  conversation={activeConversation}
                  items={messages.map((message) => ({ ...message, conversationId: activeConversation.id }))}
                  onBack={() => setView({ kind: "list" })}
                  onOpenProfile={() => {}}
                  onSend={() => {}}
                  sending={false}
                />
              ) : (
                <EmptyThread onNew={() => setView({ kind: "new" })} />
              )}
            </div>
          </div>
        </DesktopChatWidgetFrame>
      ) : null}
    </div>
  );
}

const meta = {
  title: "App/Shell/Desktop Chat Widget",
  parameters: {
    layout: "fullscreen",
  },
  render: () => <ChatWidgetStoryContent />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
