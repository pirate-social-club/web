import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { generateRedditFallbackHandle } from "@/lib/reddit-handle-suggestion";

import { DomainsTab } from "../panels/settings-page-domains-tab";
import type { DomainsTabProps, DomainsTabPhase } from "../panels/settings-page-domains-tab";

const base: DomainsTabProps = {
  currentHandle: "suspicious-code-7234.pirate",
  handleTier: "generated",
  redditImportDone: false,
  phase: "options",
  redditVerification: {
    usernameValue: "",
    verificationState: "not_started",
  },
  importJob: {
    status: "not_started",
  },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem" }}>
      {children}
    </div>
  );
}

function InteractiveStory(props: DomainsTabProps) {
  const [phase, setPhase] = React.useState<DomainsTabPhase>(props.phase ?? "options");
  const [username, setUsername] = React.useState(props.redditVerification.usernameValue);
  const [handle, setHandle] = React.useState(props.generatedHandle ?? "");
  const generateCountRef = React.useRef(0);

  return (
    <DomainsTab
      {...props}
      phase={phase}
      generatedHandle={handle}
      redditVerification={{ ...props.redditVerification, usernameValue: username }}
      onPhaseChange={setPhase}
      onRedditUsernameChange={setUsername}
      onHandleChange={setHandle}
      onGenerateHandle={() => {
        const sourceUsername = (props.redditImportSummary?.redditUsername ?? username) || "name";
        const seeds = [0.223764, 0.418907, 0.730451];
        const seed = seeds[generateCountRef.current % seeds.length] ?? 0.223764;
        generateCountRef.current += 1;
        setHandle(generateRedditFallbackHandle(sourceUsername, () => seed));
      }}
      onImportKarmaNext={() => {}}
      onImportKarmaSkip={() => setPhase("options")}
      onChooseNameContinue={() => {}}
      onChooseNameBack={() => setPhase("import_karma")}
    />
  );
}

const meta = {
  title: "Compositions/Settings/DomainsTab",
  component: DomainsTab,
  decorators: [
    (Story: () => React.ReactNode) => (
      <Wrapper>
        <Story />
      </Wrapper>
    ),
  ],
} satisfies Meta<typeof DomainsTab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Options / Default",
  render: () => <InteractiveStory {...base} />,
};

export const AlreadyImported: Story = {
  name: "Options / Already Imported",
  render: () => (
    <InteractiveStory
      {...base}
      currentHandle="technohippie.pirate"
      handleTier="standard"
      redditImportDone
    />
  ),
};

export const ImportEmpty: Story = {
  name: "Import Reddit / Empty",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
    />
  ),
};

export const ImportUsernameEntered: Story = {
  name: "Import Reddit / Username Entered",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "not_started",
      }}
    />
  ),
};

export const ImportCodeReady: Story = {
  name: "Import Reddit / Code Ready",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const ImportChecking: Story = {
  name: "Import Reddit / Checking",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "checking",
        verificationHint: "pirate-verify=a3f7c9e2",
        codePlacementSurface: "profile",
      }}
    />
  ),
};

export const ImportImporting: Story = {
  name: "Import Reddit / Importing",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
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

export const ImportDoneChooseName: Story = {
  name: "Import Reddit / Karma Imported / Choose Name",
  render: () => (
    <InteractiveStory
      {...base}
      phase="choose_name"
      generatedHandle="technohippie-223764"
      redditVerification={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={{
        redditUsername: "technohippie",
        importedRedditScore: 42000,
        coverageNote: null,
      }}
    />
  ),
};

export const ImportDoneNoArchiveData: Story = {
  name: "Import Reddit / No Archive Data",
  render: () => (
    <InteractiveStory
      {...base}
      phase="choose_name"
      generatedHandle="quietreader-223764"
      redditVerification={{
        usernameValue: "quietreader",
        verifiedUsername: "quietreader",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={{
        redditUsername: "quietreader",
        importedRedditScore: null,
        coverageNote: null,
      }}
    />
  ),
};

export const ImportVerificationFailed: Story = {
  name: "Import Reddit / Verification Failed",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "failed",
        errorTitle: "Verification code not found",
      }}
    />
  ),
};

export const ImportRateLimited: Story = {
  name: "Import Reddit / Rate Limited",
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      phaseError="Too many verification checks. Wait a minute before trying again."
      redditVerification={{
        usernameValue: "technohippie",
        verificationState: "code_ready",
        verificationHint: "pirate-verification=a3f7c9e2",
        codePlacementSurface: "profile",
        lastCheckedAt: new Date().toISOString(),
      }}
    />
  ),
};

export const MobileOptions: Story = {
  name: "Mobile / Options",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <InteractiveStory {...base} />,
};

export const MobileImportCodeReady: Story = {
  name: "Mobile / Code Ready",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <InteractiveStory
      {...base}
      phase="import_karma"
      redditVerification={{
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
      generatedHandle="technohippie-223764"
      handleSuggestion={{
        suggestedLabel: "technohippie",
        source: "verified_reddit_username",
        availability: "available",
      }}
      redditVerification={{
        usernameValue: "technohippie",
        verifiedUsername: "technohippie",
        verificationState: "verified",
      }}
      importJob={{
        status: "succeeded",
      }}
      redditImportSummary={{
        redditUsername: "technohippie",
        importedRedditScore: 42000,
        coverageNote: null,
      }}
    />
  ),
};
