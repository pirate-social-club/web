import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { Feed } from "@/components/compositions/feed/feed";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { AppSidebar } from "@/components/compositions/app-sidebar/app-sidebar";
import {
  CommunitySafetyPage,
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
  createDefaultCommunitySafetyProviderSettings,
} from "@/components/compositions/community-safety-page/community-safety-page";
import { SidebarProvider } from "@/components/compositions/sidebar/sidebar";
import { PostThread } from "@/components/compositions/post-thread/post-thread";
import { SettingsPage } from "@/components/compositions/settings-page/settings-page";
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
        actions={{ primaryLabel: "Continue", tertiaryLabel: "Skip" }}
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

    expect(markup).toContain("Handle");
    expect(markup).toContain(".pirate");
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
    expect(markup).toContain("OpenAI moderation pass");
    expect(markup).toContain("Threatening language");
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
        }}
        wallet={{
          connectedWallets: [
            {
              address: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
              chainLabel: "Ethereum",
              isPrimary: true,
            },
          ],
          primaryAddress: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
        }}
      />,
    );

    expect(markup).toContain("Settings");
    expect(markup).toContain("Profile");
    expect(markup).toContain("Save profile");
  });
});
