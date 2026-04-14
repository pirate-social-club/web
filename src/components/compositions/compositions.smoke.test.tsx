import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Flag, House, Plus } from "@phosphor-icons/react";

import { Feed } from "@/components/compositions/feed/feed";
import { OnboardingRedditBootstrap } from "@/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap";
import { AppSidebar } from "@/components/compositions/app-sidebar/app-sidebar";
import { SidebarProvider } from "@/components/compositions/sidebar/sidebar";
import { PostThread } from "@/components/compositions/post-thread/post-thread";
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

    expect(markup).toContain("Pirate");
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
        replies={[
          {
            replyId: "reply-1",
            authorLabel: "firstmate",
            body: "Looks clear from the deck.",
            timestampLabel: "1h ago",
          },
        ]}
      />,
    );

    expect(markup).toContain("Comments");
    expect(markup).toContain("Looks clear from the deck.");
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
});
