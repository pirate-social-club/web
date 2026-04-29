import type { Meta, StoryObj } from "@storybook/react-vite";

import bedsheetAvatarUrl from "@/assets/logo_ghost_sm.png";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { useIsMobile } from "@/hooks/use-mobile";

import type { ChatConversation, ChatMessageRecord } from "@/lib/chat/chat-types";
import {
  ChatSetupState,
  ConversationList,
  EmptyThread,
  NewConversationView,
  ThreadView,
} from "./chat-route-views";

const now = new Date("2026-04-26T15:30:00Z").getTime();

const bedsheetConversation: ChatConversation = {
  assistantKind: "bedsheet",
  avatarUrl: bedsheetAvatarUrl,
  id: "bedsheet",
  preview: "I found a few updates about your Pirate communities and can summarize them now.",
  targetLabel: "Pirate assistant",
  title: "Bedsheet",
  transport: "assistant",
  unreadCount: 1,
  updatedAt: now + 1000,
};

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
    id: "xmtp-conversation-3",
    peerAddress: "0x9876543210abcdef9876543210abcdef98765432",
    preview: "Encrypted conversation",
    title: "0x9876...5432",
    transport: "xmtp",
    unreadCount: 0,
    updatedAt: now - 1000 * 60 * 95,
  },
  bedsheetConversation,
];

const unreadTruncationConversations: ChatConversation[] = [
  {
    ...bedsheetConversation,
    preview:
      "This is a much longer Bedsheet update that should truncate cleanly before the unread count badge on narrow message list screens.",
    unreadCount: 128,
  },
  ...conversations.filter((conversation) => conversation.id !== bedsheetConversation.id),
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

const longMessages: ChatMessageRecord[] = Array.from({ length: 30 }, (_, i) => {
  const isUser = i % 2 === 0;
  const contents = [
    "Can you send over the community namespace notes?",
    "Yes. I am checking the profile routing first.",
    "That works. I can send the namespace notes in a minute.",
    "Also, do you have the latest Figma file for the profile page?",
    "I just shared it with you. Let me know if you need edit access.",
    "Thanks! I'll review it this afternoon.",
    "The scroll behavior on mobile seems a bit off. Can you take a look?",
    "Sure, I noticed that too. I think it's the safe-area inset.",
    "Let me know when the fix is up and I'll test it on my device.",
    "Pushed a commit — added pt-safe to the thread container.",
    "Looks good now. The messages scroll smoothly.",
    "Great. I'll mark the ticket as done.",
    "One more thing — the send button on iOS looks slightly oval.",
    "Hmm, might be flex-shrink squeezing it. I'll add shrink-0.",
    "Perfect. That's exactly what I was thinking.",
  ];
  return {
    content: contents[i % contents.length],
    conversationId: "xmtp-conversation-1",
    createdAt: now - 1000 * 60 * (30 - i),
    id: `message-long-${i}`,
    sender: isUser ? "user" : "peer",
  };
});

function DesktopChatStory({ items = messages }: { items?: ChatMessageRecord[] } = {}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-screen bg-background">
        <ThreadView
          conversation={conversations[0]}
          items={items}
          onBack={() => {}}
          onClose={() => {}}
          onOpenProfile={() => {}}
          onSend={() => {}}
          sending={false}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 w-full bg-background p-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-background shadow-sm">
        <div className="h-full min-h-0 w-96 shrink-0">
          <ConversationList
            activeConversationId={conversations[0].id}
            conversations={conversations}
            loading={false}
            onNew={() => {}}
            onSelect={() => {}}
          />
        </div>
        <div className="min-h-0 flex-1">
          <ThreadView
            conversation={conversations[0]}
            items={items}
            onBack={() => {}}
            onOpenProfile={() => {}}
            onSend={() => {}}
            sending={false}
          />
        </div>
      </div>
    </div>
  );
}

function DesktopEmptyThreadStory() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-screen bg-background">
        <ConversationList
          className="border-e-0"
          conversations={conversations}
          loading={false}
          onNew={() => {}}
          onSelect={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 w-full bg-background p-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl overflow-hidden rounded-[var(--radius-xl)] border border-border-soft bg-background shadow-sm">
        <div className="h-full min-h-0 w-96 shrink-0">
          <ConversationList
            conversations={conversations}
            loading={false}
            onNew={() => {}}
            onSelect={() => {}}
          />
        </div>
        <div className="min-h-0 flex-1">
          <EmptyThread onNew={() => {}} />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "App/Routes/Chat",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DesktopThread: Story = {
  render: () => <DesktopChatStory />,
};

export const DesktopLongThread: Story = {
  render: () => <DesktopChatStory items={longMessages} />,
};

export const DesktopEmptyThread: Story = {
  render: () => <DesktopEmptyThreadStory />,
};

export const ChatSetupLoading: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <ChatSetupState
        busy
        description="Pirate is preparing encrypted direct messages for this wallet."
        onRetry={() => {}}
        title="Setting up messages"
      />
    </div>
  ),
};

export const ChatSetupError: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <ChatSetupState
        busy={false}
        description="We couldn't prepare encrypted messages for this wallet."
        error="Chat is open in another tab. Close the other tab and try again."
        onRetry={() => {}}
        retryLabel="Try again"
        title="Message setup failed"
      />
    </div>
  ),
};

export const ChatSetupSignatureNeeded: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <ChatSetupState
        busy={false}
        description={"Confirm this wallet belongs to you.\nThis signature won't create a transaction or cost gas."}
        onRetry={() => {}}
        presentation="signature"
        retryLabel="Sign"
        title="Sign to continue"
      />
    </div>
  ),
};

export const NewConversation: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <NewConversationView
        busy={false}
        onBack={() => {}}
        onSubmit={() => {}}
      />
    </div>
  ),
};

export const NewConversationError: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <NewConversationView
        busy={false}
        error="No XMTP inbox was found for that target."
        onBack={() => {}}
        onSubmit={() => {}}
      />
    </div>
  ),
};

export const MobileList: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="h-screen bg-background">
      <ConversationList
        className="border-e-0 bg-background"
        conversations={conversations}
        loading={false}
        onNew={() => {}}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const MobileUnreadPreviewTruncation: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="h-screen bg-background">
      <ConversationList
        className="border-e-0 bg-background"
        conversations={unreadTruncationConversations}
        loading={false}
        onNew={() => {}}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const MobileThread: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="h-screen bg-background">
      <ThreadView
        conversation={conversations[0]}
        items={messages}
        onBack={() => {}}
        onClose={() => {}}
        onOpenProfile={() => {}}
        onSend={() => {}}
        sending={false}
      />
    </div>
  ),
};

export const MobileStandaloneXmtpThread: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <MobilePageHeader
        onCloseClick={() => {}}
        onTitleClick={() => {}}
        title={conversations[0].title}
        titleAvatarFallback={conversations[0].title}
        titleAvatarSrc={conversations[0].avatarUrl}
      />
      <div className="h-screen pt-[calc(env(safe-area-inset-top)+4rem)]">
        <ThreadView
          conversation={conversations[0]}
          hideHeader
          items={messages}
          onBack={() => {}}
          onClose={() => {}}
          onOpenProfile={() => {}}
          onSend={() => {}}
          sending={false}
        />
      </div>
    </div>
  ),
};

export const MobileStandaloneBedsheetThread: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <MobilePageHeader
        onCloseClick={() => {}}
        onTitleClick={() => {}}
        title={bedsheetConversation.title}
        titleAvatarFallback={bedsheetConversation.title}
        titleAvatarSrc={bedsheetConversation.avatarUrl}
      />
      <div className="h-screen pt-[calc(env(safe-area-inset-top)+4rem)]">
        <ThreadView
          conversation={bedsheetConversation}
          hideHeader
          items={messages.map((message) => ({ ...message, conversationId: bedsheetConversation.id }))}
          onBack={() => {}}
          onClose={() => {}}
          onOpenProfile={() => {}}
          onSend={() => {}}
          sending={false}
        />
      </div>
    </div>
  ),
};

export const MobileLoadingList: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="h-screen bg-background">
      <ConversationList
        className="border-e-0 bg-background"
        conversations={[]}
        loading
        onNew={() => {}}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const MobileLongThread: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="h-screen bg-background">
      <ThreadView
        conversation={conversations[0]}
        items={longMessages}
        onBack={() => {}}
        onClose={() => {}}
        onOpenProfile={() => {}}
        onSend={() => {}}
        sending={false}
      />
    </div>
  ),
};

const overflowMessages: ChatMessageRecord[] = [
  ...messages,
  {
    content:
      "Check out this link: https://example.com/very/long/url/path/that/should/not/overflow/the/message/bubble/on/mobile/screens",
    conversationId: "xmtp-conversation-1",
    createdAt: now - 1000 * 60 * 2,
    id: "message-overflow",
    sender: "user",
  },
  {
    content:
      "Here is a really long unbrokenstringwithoutanyspaceswhatsoeverjusttoensurethatwordbreakingworksproperlyinchatbubblesonmobileweb",
    conversationId: "xmtp-conversation-1",
    createdAt: now - 1000 * 60,
    id: "message-overflow-2",
    sender: "peer",
  },
  {
    content:
      "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
    conversationId: "xmtp-conversation-1",
    createdAt: now - 1000 * 30,
    id: "message-overflow-3",
    sender: "user",
  },
];

export const MobileOverflowMessage: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="h-screen bg-background">
      <ThreadView
        conversation={conversations[0]}
        items={overflowMessages}
        onBack={() => {}}
        onClose={() => {}}
        onOpenProfile={() => {}}
        onSend={() => {}}
        sending={false}
      />
    </div>
  ),
};

export const MobileStandaloneOverflowMessage: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <MobilePageHeader
        onCloseClick={() => {}}
        title={conversations[0].title}
        titleAvatarFallback={conversations[0].title}
        titleAvatarSrc={conversations[0].avatarUrl}
      />
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden bg-background pt-[calc(env(safe-area-inset-top)+4rem)] md:max-w-6xl">
        <ThreadView
          conversation={conversations[0]}
          hideHeader
          items={overflowMessages}
          onBack={() => {}}
          onClose={() => {}}
          onOpenProfile={() => {}}
          onSend={() => {}}
          sending={false}
        />
      </div>
    </div>
  ),
};
