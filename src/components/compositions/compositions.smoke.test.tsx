import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { Feed } from "@/components/compositions/posts/feed/feed";
import { AppHeader } from "@/components/compositions/app/app-shell-chrome/app-header";
import { CommunityAgentPolicyPage } from "@/components/compositions/community/agent-policy/community-agent-policy";
import { NotificationInboxPage } from "@/components/compositions/notifications/inbox-page/notification-inbox-page";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding/reddit-bootstrap/onboarding-reddit-bootstrap";
import { AppSidebar } from "@/components/compositions/app/app-sidebar/app-sidebar";
import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import {
  CommunitySafetyPage,
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
  createDefaultCommunitySafetyProviderSettings,
} from "@/components/compositions/community/safety-page/community-safety-page";
import { SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";
import { PostThread } from "@/components/compositions/posts/post-thread/post-thread";
import { SettingsPage } from "@/components/compositions/settings/settings-page/settings-page";
import { WalletHub } from "@/components/compositions/wallet/wallet-hub/wallet-hub";
import { UiLocaleProvider } from "@/lib/ui-locale";

const primaryItems = [
  { id: "home", icon: House, label: "Home" },
  { id: "your-communities", icon: Flag, label: "Your Communities" },
  { id: "create-community", icon: Plus, label: "Create Community" },
] as const;

const sidebarSections = [
  {
    id: "recent",
    label: "Recent",
    defaultOpen: true,
    items: [
      { id: "c/pirate", label: "c/pirate" },
      { id: "c/music", label: "c/music" },
    ],
  },
] as const;

const basePost = {
  byline: {
    author: {
      kind: "user" as const,
      label: "captainhook",
    },
    community: {
      kind: "community" as const,
      label: "c/pirate",
    },
    timestampLabel: "2h ago",
  },
  title: "Ship log",
  content: {
    type: "text" as const,
    body: "All systems steady.",
  },
  engagement: {
    score: 42,
    commentCount: 3,
  },
};

const namespaceVerificationTask = {
  id: "tsk_namespace_infinity",
  user: "usr_owner_1",
  type: "namespace_verification_required" as const,
  subject_type: "community",
  subject: "gld_community_1",
  status: "open" as const,
  priority: 10,
  payload: {
    community_display_name: "Infinity Mirror",
    target_path: "/c/gld_community_1/mod/namespace",
  },
  resolved_at: null,
  dismissed_at: null,
  created: "2026-04-19T08:00:00.000Z",
  updated: "2026-04-19T08:00:00.000Z",
};

const commentReplyNotification = {
  event: {
    id: "nev_reply_1",
    type: "comment_reply" as const,
    actor_user: "usr_actor_1",
    subject_type: "comment",
    subject: "cmt_parent_1",
    object_type: "comment",
    object_id: "cmt_reply_1",
    payload: {
      community: "gld_community_1",
      thread_root_post_id: "pst_root_1",
    },
    created: "2026-04-19T11:45:00.000Z",
  },
  receipt: {
    id: "nev_reply_1",
    recipient_user_id: "usr_owner_1",
    seen_at: null,
    read_at: null,
    created: "2026-04-19T11:45:00.000Z",
  },
};

function render(ui: React.ReactElement) {
  return renderToStaticMarkup(ui);
}

describe("composition smoke tests", () => {
  test("renders the sidebar shell", () => {
    const markup = render(
      <UiLocaleProvider dir="ltr" locale="en">
        <SidebarProvider>
          <AppSidebar
            brandLabel="Pirate"
            primaryItems={primaryItems}
            resourceItems={[{ id: "blog", label: "Blog" }]}
            resourcesLabel="Resources"
            sections={sidebarSections}
          />
        </SidebarProvider>
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Home");
    expect(markup).toContain("Resources");
  });

  test("renders feed items and header copy", () => {
    const markup = render(
      <Feed
        activeSort="best"
        availableSorts={[
          { label: "Best", value: "best" },
          { label: "New", value: "new" },
        ]}
        items={[
          {
            id: "post-1",
            post: basePost,
          },
        ]}
        subtitle="What the crew is tracking today."
        title="Home"
      />,
    );

    expect(markup).toContain("Home");
    expect(markup).toContain("Ship log");
  });

  test("renders the app header brand in uppercase", () => {
    const markup = render(
      <UiLocaleProvider dir="ltr" locale="en">
        <SidebarProvider>
          <AppHeader onHomeClick={() => undefined} />
        </SidebarProvider>
      </UiLocaleProvider>,
    );

    expect(markup).toContain("PIRATE");
  });

  test("renders the mobile app header create action as a single plus", () => {
    const markup = render(
      <UiLocaleProvider dir="ltr" locale="en">
        <SidebarProvider>
          <AppHeader
            forceMobile
            hideBrand
            mobileLeadingContent={<div className="h-11 w-11" aria-hidden="true" />}
            onCreateClick={() => undefined}
            showCreateAction
            showMobileCreateAction
          />
        </SidebarProvider>
      </UiLocaleProvider>,
    );

    expect((markup.match(/<svg/g) ?? []).length).toBe(1);
  });

  test("renders sidebar requirements as a minimal section", () => {
    const markup = render(
      <CommunitySidebar
        createdAt="2026-04-19T08:00:00.000Z"
        displayName="Requirements Club"
        membershipMode="gated"
        moderators={[]}
        requirements={["Palestine nationality", "18+"]}
      />,
    );

    expect(markup).toContain("Requirements");
    expect(markup).toContain("Palestine nationality");
    expect(markup).toContain("18+");
  });

  test("renders a post thread with replies", () => {
    const markup = render(
      <PostThread
        commentsBody="Crew discussion continues below."
        commentsHeading="Comments"
        post={basePost}
        comments={[
          {
            commentId: "reply-1",
            authorLabel: "firstmate",
            body: "Looks clear from the deck.",
            timestampLabel: "1h ago",
            children: [
              {
                commentId: "reply-1-1",
                authorLabel: "lookout",
                body: "Keeping the branch folded until someone opens it is the right call.",
                timestampLabel: "48m ago",
              },
            ],
          },
        ]}
      />,
    );

    expect(markup).toContain("Comments");
    expect(markup).toContain("Looks clear from the deck.");
    expect(markup).toContain("Keeping the branch folded until someone opens it is the right call.");
  });

  test("renders Arabic translated thread content with RTL direction", () => {
    const markup = render(
      <PostThread
        commentsHeading="التعليقات"
        commentsHeadingDir="rtl"
        commentsHeadingLang="ar"
        post={{
          ...basePost,
          title: "اختبار مرحبا بالعالم",
          titleDir: "rtl",
          titleLang: "ar",
          content: {
            type: "text",
            body: "هل تسمعني؟",
            bodyDir: "rtl",
            bodyLang: "ar",
          },
        }}
        comments={[
          {
            commentId: "reply-ar-1",
            authorLabel: "u/arabic",
            body: "هذا تعليق مترجم.",
            bodyDir: "rtl",
            bodyLang: "ar",
            timestampLabel: "1h ago",
          },
        ]}
      />,
    );

    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain('lang="ar"');
    expect(markup).toContain("اختبار مرحبا بالعالم");
    expect(markup).toContain("هل تسمعني؟");
    expect(markup).toContain("هذا تعليق مترجم.");
  });

  test("renders onboarding without a browser environment", () => {
    const markup = render(
      <OnboardingRedditBootstrap
        canSkip
        generatedHandle="captainhook.pirate"
        handleSuggestion={{
          suggestedLabel: "captainhook",
          source: "verified_reddit_username",
          availability: "available",
        }}
        importJob={{ status: "not_started" }}
        phase="choose_name"
        reddit={{ usernameValue: "captainhook", verificationState: "not_started" }}
      />,
    );

    expect(markup).toContain("captainhook");
    expect(markup).toContain(".pirate");
  });

  test("renders the notification inbox page", () => {
    const markup = render(
      <NotificationInboxPage
        activityItems={[commentReplyNotification]}
        tasks={[namespaceVerificationTask]}
      />,
    );

    expect(markup).toContain("Notifications");
    expect(markup).toContain("Verify your community namespace");
    expect(markup).toContain("Someone replied to your comment");
  });

  test("renders the moderation safety page", () => {
    const markup = render(
      <CommunitySafetyPage
        adultContentPolicy={createDefaultCommunitySafetyAdultContentPolicy()}
        civilityPolicy={createDefaultCommunitySafetyCivilityPolicy()}
        graphicContentPolicy={createDefaultCommunitySafetyGraphicContentPolicy()}
        providerSettings={createDefaultCommunitySafetyProviderSettings()}
      />,
    );

    expect(markup).toContain("Safety");
    expect(markup).toContain("Visual moderation pass");
    expect(markup).toContain("Threatening language");
  });

  test("renders the moderation agents page", () => {
    const markup = render(
      <CommunityAgentPolicyPage
        settings={{
          agentPostingPolicy: "allow",
          agentPostingScope: "replies_only",
          acceptedAgentOwnershipProviders: ["clawkey"],
          dailyPostCap: 5,
          dailyReplyCap: 20,
        }}
        submitState={{ kind: "idle" }}
      />,
    );

    expect(markup).toContain("Agents");
    expect(markup).toContain("Posting policy");
    expect(markup).toContain("Ownership providers");
    expect(markup).toContain("Agent posts per day");
  });

  test("renders the settings shell", () => {
    const markup = render(
      <SettingsPage
        activeTab="profile"
        preferences={{
          ageStatusLabel: "18+ verified",
          locale: "en",
          localeOptions: [
            { label: "English", value: "en" },
            { label: "Arabic", value: "ar" },
            { label: "Mandarin", value: "zh" },
          ],
          submitState: { kind: "idle" },
        }}
        profile={{
          avatarSrc: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
          bio: "Making internet-native spaces for music and culture.",
          coverSrc: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
          currentHandle: "captainblackbeard.pirate",
          displayName: "Blackbeard",
          linkedHandles: [{
            handleId: null,
            kind: "pirate",
            label: "captainblackbeard.pirate",
            primary: true,
            verificationState: "verified",
          }],
          postAuthorLabel: "captainblackbeard.pirate",
          submitState: { kind: "idle" },
          publicHandlesSubmitState: { kind: "idle" },
        }}
        agents={{
          items: [],
          canRegister: false,
          registrationState: { kind: "idle" },
        }}
      />,
    );

    expect(markup).toContain("Settings");
    expect(markup).toContain("Profile");
    expect(markup).toContain("Save profile");
  });

  test("renders the wallet hub", () => {
    const markup = render(
      <UiLocaleProvider dir="ltr" locale="en">
        <WalletHub
          chainSections={[
            {
              availability: "ready",
              chainId: "ethereum",
              title: "Ethereum",
              tokens: [{ id: "eth", name: "Ether", symbol: "ETH", balance: "1.28" }],
            },
            {
              availability: "ready",
              chainId: "base",
              title: "Base",
              tokens: [{ id: "base-eth", name: "Ether", symbol: "ETH", balance: "0.64" }],
            },
            {
              availability: "ready",
              chainId: "optimism",
              title: "Optimism",
              tokens: [{ id: "op-eth", name: "Ether", symbol: "ETH", balance: "0.18" }],
            },
            {
              availability: "ready",
              chainId: "story",
              title: "Story",
              tokens: [{ id: "story-ip", name: "IP", symbol: "IP", balance: "18.20" }],
            },
          ]}
          walletAddress="0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8"
          walletLabel="Connected EVM wallet"
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Send");
    expect(markup).toContain("Receive");
    expect(markup).toContain("2.1");
    expect(markup).toContain("ETH");
    expect(markup).toContain("IP");
    expect(markup).toContain("18.2");
  });

  test("renders disabled wallet actions while wallet lookup is pending", () => {
    const markup = render(
      <UiLocaleProvider dir="ltr" locale="en">
        <WalletHub
          chainSections={[{
            availability: "ready",
            chainId: "ethereum",
            title: "Ethereum",
            tokens: [{ id: "eth", name: "Ether", symbol: "ETH", balance: "0", usdPrice: 0 }],
          }]}
          totalBalanceUsd="$0.00"
          walletActionsPending
        />
      </UiLocaleProvider>,
    );

    expect(markup).toContain("Send");
    expect(markup).toContain("Receive");
    expect(markup).toContain("disabled");
  });

  test("renders the settings agents tab", () => {
    const markup = render(
      <SettingsPage
        activeTab="agents"
        preferences={{
          ageStatusLabel: "18+ verified",
          locale: "en",
          localeOptions: [
            { label: "English", value: "en" },
          ],
          submitState: { kind: "idle" },
        }}
        profile={{
          bio: "",
          currentHandle: "captainblackbeard.pirate",
          displayName: "Blackbeard",
          linkedHandles: [{
            handleId: null,
            kind: "pirate",
            label: "captainblackbeard.pirate",
            primary: true,
            verificationState: "verified",
          }],
          postAuthorLabel: "captainblackbeard.pirate",
          submitState: { kind: "idle" },
          publicHandlesSubmitState: { kind: "idle" },
        }}
        agents={{
          items: [{
            agentId: "agt_demo1",
            displayName: "Captain Bot",
            handleLabel: null,
            status: "active",
            createdAt: "2026-03-15T10:00:00Z",
            currentOwnership: {
              ownershipProvider: "clawkey",
              verifiedAt: "2026-03-15T10:05:00Z",
              expiresAt: null,
            },
          }],
          canRegister: false,
          registrationState: { kind: "idle" },
        }}
      />,
    );

    expect(markup).toContain("Agents");
    expect(markup).toContain("Captain Bot");
    expect(markup).toContain("ClawKey");
  });
});
