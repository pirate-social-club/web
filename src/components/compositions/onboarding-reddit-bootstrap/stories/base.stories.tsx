import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  OnboardingRedditOptional,
  OnboardingChoosePirateUsername,
  OnboardingCommunitySuggestions,
} from "../onboarding-reddit-bootstrap";
import type {
  OnboardingRedditOptionalProps,
  OnboardingChoosePirateUsernameProps,
  OnboardingCommunitySuggestionsProps,
} from "../onboarding-reddit-bootstrap.types";

const redditBase: OnboardingRedditOptionalProps = {
  canSkip: true,
  canContinue: true,
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

const decorator = (Story: () => React.ReactNode) => (
  <div style={{ width: "min(100vw - 32px, 980px)" }}>
    <Story />
  </div>
);

const RedditMeta = {
  title: "Compositions/OnboardingRedditOptional",
  component: OnboardingRedditOptional,
  args: redditBase,
  decorators: [decorator],
} satisfies Meta<typeof OnboardingRedditOptional>;

export default RedditMeta;

type RedditStory = StoryObj<typeof RedditMeta>;

export const RedditEmpty: RedditStory = {
  name: "Reddit / Empty",
  render: () => <OnboardingRedditOptional {...redditBase} />,
};

export const RedditUsernameEntered: RedditStory = {
  name: "Reddit / Username Entered",
  render: () => (
    <OnboardingRedditOptional
      {...redditBase}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "not_started",
      }}
    />
  ),
};

export const RedditCodeReady: RedditStory = {
  name: "Reddit / Code Ready",
  render: () => (
    <OnboardingRedditOptional
      {...redditBase}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const RedditChecking: RedditStory = {
  name: "Reddit / Checking",
  render: () => (
    <OnboardingRedditOptional
      {...redditBase}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "checking",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const RedditImporting: RedditStory = {
  name: "Reddit / Importing",
  render: () => (
    <OnboardingRedditOptional
      {...redditBase}
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

export const RedditDone: RedditStory = {
  name: "Reddit / Done",
  render: () => (
    <OnboardingRedditOptional
      {...redditBase}
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

export const RedditFailed: RedditStory = {
  name: "Reddit / Verification Failed",
  render: () => (
    <OnboardingRedditOptional
      {...redditBase}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "failed",
        errorTitle: "Verification code not found",
      }}
    />
  ),
};

export const RedditMobileCodeReady: RedditStory = {
  name: "Reddit / Mobile / Code Ready",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <OnboardingRedditOptional
      {...redditBase}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

// Username stories

const UsernameMeta = {
  title: "Compositions/OnboardingChoosePirateUsername",
  component: OnboardingChoosePirateUsername,
  args: {
    actions: { primaryLabel: "Continue" },
  },
  decorators: [decorator],
} satisfies Meta<typeof OnboardingChoosePirateUsername>;

type UsernameStory = StoryObj<typeof UsernameMeta>;

export const UsernameEmpty: UsernameStory = {
  name: "Username / Empty (Reddit skipped)",
  render: () => <OnboardingChoosePirateUsername actions={{ primaryLabel: "Continue" }} />,
};

export const UsernamePrefilledFromReddit: UsernameStory = {
  name: "Username / Prefilled From Reddit",
  render: () => (
    <OnboardingChoosePirateUsername
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "available",
      }}
      actions={{ primaryLabel: "Continue" }}
    />
  ),
};

export const UsernameSuggestionTaken: UsernameStory = {
  name: "Username / Suggested Handle Taken",
  render: () => (
    <OnboardingChoosePirateUsername
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "taken",
      }}
      actions={{ primaryLabel: "Continue" }}
    />
  ),
};

export const UsernameMobile: UsernameStory = {
  name: "Username / Mobile",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <OnboardingChoosePirateUsername
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "available",
      }}
      actions={{ primaryLabel: "Continue" }}
    />
  ),
};

// Communities stories

const CommunitiesMeta = {
  title: "Compositions/OnboardingCommunitySuggestions",
  component: OnboardingCommunitySuggestions,
  args: {
    communities: [],
    actions: {
      primaryLabel: "Continue",
      tertiaryLabel: "Skip",
    },
  },
  decorators: [decorator],
} satisfies Meta<typeof OnboardingCommunitySuggestions>;

type CommunitiesStory = StoryObj<typeof CommunitiesMeta>;

export const CommunitiesWithSuggestions: CommunitiesStory = {
  name: "Communities / With Suggestions",
  render: () => (
    <OnboardingCommunitySuggestions
      communities={richSnapshot.suggestedCommunities}
      actions={{
        primaryLabel: "Continue",
        tertiaryLabel: "Skip",
      }}
    />
  ),
};

export const CommunitiesEmpty: CommunitiesStory = {
  name: "Communities / Empty",
  render: () => (
    <OnboardingCommunitySuggestions
      communities={[]}
      actions={{
        primaryLabel: "Continue",
        tertiaryLabel: "Skip",
      }}
    />
  ),
};
