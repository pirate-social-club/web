import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { generateRedditFallbackHandle } from "@/lib/reddit-handle-suggestion";

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
};

const importedSummary = {
  redditUsername: "technohippie",
  importedRedditScore: 42000,
  coverageNote: null,
};

const emptyArchiveSummary = {
  redditUsername: "quietreader",
  importedRedditScore: null,
  coverageNote: null,
};

function InteractiveStory(props: OnboardingRedditBootstrapProps) {
  const [handle, setHandle] = React.useState(props.generatedHandle);
  const [username, setUsername] = React.useState(props.reddit.usernameValue);
  const generateCountRef = React.useRef(0);

  return (
    <OnboardingRedditBootstrap
      {...props}
      generatedHandle={handle}
      reddit={{ ...props.reddit, usernameValue: username }}
      callbacks={{
        onUsernameChange: setUsername,
        onImportKarmaNext: () => {},
        onImportKarmaSkip: () => {},
        onHandleChange: setHandle,
        onGenerateHandle: () => {
          const sourceUsername = (props.redditImportSummary?.redditUsername ?? username) || "name";
          const seeds = [0.223764, 0.418907, 0.730451];
          const seed = seeds[generateCountRef.current % seeds.length] ?? 0.223764;
          generateCountRef.current += 1;
          setHandle(generateRedditFallbackHandle(sourceUsername, () => seed));
        },
        onChooseNameBack: () => {},
        onChooseNameContinue: () => {},
      }}
    />
  );
}

const meta = {
  title: "Compositions/Onboarding/RedditBootstrap",
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
  name: "Import Reddit / Empty",
  render: () => <InteractiveStory {...base} />,
};

export const ImportKarmaUsernameEntered: Story = {
  name: "Import Reddit / Username Entered",
  render: () => (
    <InteractiveStory
      {...base}
      reddit={{
        usernameValue: "technohippie",
        verificationState: "not_started",
      }}
    />
  ),
};

export const ImportKarmaCodeReady: Story = {
  name: "Import Reddit / Code Ready",
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
  name: "Import Reddit / Checking",
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
  name: "Import Reddit / Importing",
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
  name: "Import Reddit / Karma Imported",
  render: () => (
    <InteractiveStory
      {...base}
      generatedHandle="technohippie-223764"
      reddit={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={importedSummary}
    />
  ),
};

export const ImportKarmaDoneNoArchiveData: Story = {
  name: "Import Reddit / No Archive Data",
  render: () => (
    <InteractiveStory
      {...base}
      generatedHandle="quietreader-223764"
      reddit={{
        usernameValue: "quietreader",
        verifiedUsername: "quietreader",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={emptyArchiveSummary}
    />
  ),
};

export const ImportKarmaFailed: Story = {
  name: "Import Reddit / Verification Failed",
  render: () => (
    <InteractiveStory
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
  name: "Import Reddit / Rate Limited",
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
  name: "Import Reddit / Source Error",
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
    <InteractiveStory
      {...base}
      phase="choose_name"
    />
  ),
};

export const ChooseNameWithSuggestion: Story = {
  name: "Choose Name / With Reddit Suggestion",
  render: () => (
    <InteractiveStory
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
    <InteractiveStory
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
    <InteractiveStory
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
    <InteractiveStory
      {...base}
      generatedHandle="brisk-anchor-2330"
      phase="choose_name"
      phaseError="Desired label is unavailable."
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

export const ImportKarmaArabic: Story = {
  name: "Import Reddit / Arabic",
  globals: {
    direction: "auto",
    locale: "ar",
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
    <InteractiveStory
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

export const MobileCodeReadyArabic: Story = {
  name: "Mobile / Code Ready / Arabic",
  globals: {
    direction: "auto",
    locale: "ar",
  },
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

export const MobileImportKarmaDone: Story = {
  name: "Mobile / Karma Imported",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <InteractiveStory
      {...base}
      generatedHandle="technohippie-223764"
      reddit={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={importedSummary}
    />
  ),
};

export const MobileChooseNameArabic: Story = {
  name: "Mobile / Choose Name / Arabic",
  globals: {
    direction: "auto",
    locale: "ar",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <InteractiveStory
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
