import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { OnboardingRedditBootstrap } from "../onboarding-reddit-bootstrap";
import type { OnboardingRedditBootstrapProps } from "../onboarding-reddit-bootstrap.types";

const base: OnboardingRedditBootstrapProps = {
  generatedHandle: "suspicious-code-7234.pirate",
  canSkip: true,
  phase: "import_karma",
  reddit: {
    usernameValue: "",
    verificationState: "not_started",
  },
  importJob: {
    status: "not_started",
  },
  actions: {
    primaryLabel: "Continue",
    tertiaryLabel: "Skip",
  },
};

const richSnapshot = {
  accountAgeDays: 2847,
  globalKarma: 18432,
  topSubreddits: [
    { subreddit: "hiphopheads", karma: 4821, posts: 12, rankSource: "karma" as const },
    { subreddit: "electronicmusic", karma: 2103, posts: 8, rankSource: "karma" as const },
    { subreddit: "design", karma: 1547, posts: 23, rankSource: "karma" as const },
  ],
  moderatorOf: [],
  inferredInterests: ["hip-hop", "left-field electronic", "design"],
  suggestedCommunities: [
    { communityId: "club_hhh", name: "c/hiphopheads", reason: "Active in r/hiphopheads with 4.8k karma" },
    { communityId: "club_electronic", name: "c/electronic", reason: "Regular in r/electronicmusic" },
    { communityId: "club_design", name: "c/design", reason: "23 posts in r/design" },
  ],
};

const meta = {
  title: "Compositions/OnboardingRedditBootstrap",
  component: OnboardingRedditBootstrap,
  args: base,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ width: "min(100vw - 32px, 980px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OnboardingRedditBootstrap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ImportKarmaEmpty: Story = {
  name: "Import Karma / Empty",
  render: () => <OnboardingRedditBootstrap {...base} />,
};

export const ImportKarmaUsernameEntered: Story = {
  name: "Import Karma / Username Entered",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "not_started",
      }}
    />
  ),
};

export const ImportKarmaCodeReady: Story = {
  name: "Import Karma / Code Ready",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const ImportKarmaChecking: Story = {
  name: "Import Karma / Checking",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "checking",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const ImportKarmaImporting: Story = {
  name: "Import Karma / Importing",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "running",
      }}
    />
  ),
};

export const ImportKarmaDone: Story = {
  name: "Import Karma / Done",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      snapshot={richSnapshot}
    />
  ),
};

export const ImportKarmaFailed: Story = {
  name: "Import Karma / Verification Failed",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "failed",
        errorTitle: "Verification code not found",
      }}
    />
  ),
};

export const ImportKarmaRateLimited: Story = {
  name: "Import Karma / Rate Limited",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phaseError="Too many verification checks. Wait a minute before trying again."
      reddit={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verification=a3f7c9e2",
        codePlacementSurface: "profile",
        lastCheckedAt: new Date().toISOString(),
      }}
    />
  ),
};

export const ImportKarmaSourceError: Story = {
  name: "Import Karma / Source Error",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phaseError="Reddit could not be checked right now. Try again in a moment."
      reddit={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verification=a3f7c9e2",
        codePlacementSurface: "profile",
        lastCheckedAt: new Date().toISOString(),
      }}
    />
  ),
};

export const ChooseNameDefault: Story = {
  name: "Choose Name / Default",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phase="choose_name"
    />
  ),
};

export const ChooseNameWithSuggestion: Story = {
  name: "Choose Name / With Reddit Suggestion",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phase="choose_name"
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "available",
      }}
    />
  ),
};

export const ChooseNameSuggestionTaken: Story = {
  name: "Choose Name / Suggestion Taken",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phase="choose_name"
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "taken",
      }}
    />
  ),
};

export const ChooseNameShortHandle: Story = {
  name: "Choose Name / Short Handle Error",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      generatedHandle="ab"
      phase="choose_name"
      phaseError="Handle must be at least 3 characters."
    />
  ),
};

export const ChooseNameRenameFailed: Story = {
  name: "Choose Name / Rename Failed",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      generatedHandle="brisk-anchor-2330"
      phase="choose_name"
      phaseError="Desired label is unavailable."
    />
  ),
};

export const SuggestedCommunitiesWithCommunities: Story = {
  name: "Suggested Communities / With Communities",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phase="suggested_communities"
      snapshot={richSnapshot}
    />
  ),
};

export const SuggestedCommunitiesEmpty: Story = {
  name: "Suggested Communities / Empty",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phase="suggested_communities"
    />
  ),
};

export const SuggestedCommunitiesError: Story = {
  name: "Suggested Communities / Error",
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phase="suggested_communities"
      phaseError="Could not finish onboarding. Try again."
    />
  ),
};

export const MobileCodeReady: Story = {
  name: "Mobile / Code Ready",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const MobileChooseName: Story = {
  name: "Mobile / Choose Name",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <OnboardingRedditBootstrap
      {...base}
      phase="choose_name"
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "available",
      }}
    />
  ),
};
