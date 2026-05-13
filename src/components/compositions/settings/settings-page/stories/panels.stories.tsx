import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  AgentsTab,
  DomainsTab,
  PreferencesTab,
  ProfileTab,
} from "../panels";
import type { SettingsPageProps } from "../settings-page.types";
import type { DomainsTabProps } from "../panels/settings-page-domains-tab";

type MockHandleFlow = NonNullable<SettingsPageProps["profile"]["handleFlow"]>;

const meta = {
  title: "Compositions/Settings/Panels",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="mx-auto min-h-screen w-full max-w-4xl px-5 py-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function makeMockHandleFlow(overrides: Partial<MockHandleFlow> = {}): MockHandleFlow {
  return {
    draft: "",
    preview: "",
    state: { kind: "idle" },
    setDraft: () => {},
    checkAvailability: () => {},
    submitRename: async () => {},
    resetState: () => {},
    ...overrides,
  };
}

const profileFixture: SettingsPageProps["profile"] = {
  avatarSrc: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
  avatarSource: "ens",
  bio: "Making internet-native spaces for music and culture.",
  bioSource: "ens",
  canUseEnsAvatar: true,
  canUseEnsBio: true,
  canUseEnsCover: true,
  coverSrc: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
  coverSource: "ens",
  currentHandle: "captainblackbeard.pirate",
  displayName: "Blackbeard",
  ensHandleLabel: "blackbeard.eth",
  handleFlow: makeMockHandleFlow(),
  linkedHandles: [
    {
      handleId: null,
      kind: "pirate",
      label: "captainblackbeard.pirate",
      primary: false,
      verificationState: "verified",
    },
    {
      handleId: "lnk_ens_blackbeard",
      kind: "ens",
      label: "blackbeard.eth",
      primary: true,
      verificationState: "verified",
    },
    {
      handleId: "lnk_ens_stale",
      kind: "ens",
      label: "captainblackbeard.eth",
      primary: false,
      verificationState: "stale",
    },
  ],
  primaryHandleId: "lnk_ens_blackbeard",
  postAuthorLabel: "blackbeard.eth",
  publicHandlesSaveDisabled: false,
  publicHandlesSubmitState: { kind: "idle" },
  submitState: { kind: "idle" },
  onPublicHandlesSave: () => {},
};

const preferencesFixture: SettingsPageProps["preferences"] = {
  ageStatusLabel: "18+ verified",
  locale: "en",
  localeOptions: [
    { label: "English", value: "en" },
    { label: "Arabic", value: "ar" },
    { label: "Mandarin", value: "zh" },
    { label: "Pseudo", value: "pseudo" },
  ],
  nationalityBadgeCountryCode: "GB",
  nationalityBadgeCountryLabel: "United Kingdom verified",
  nationalityBadgeDisabled: false,
  nationalityBadgeEnabled: false,
  submitState: { kind: "idle" },
};

const agentsFixture: SettingsPageProps["agents"] = {
  items: [
    {
      agentId: "agt_demo1",
      displayName: "Captain Bot",
      handleLabel: "captain-bot.clawitzer",
      status: "active",
      createdAt: "2026-03-15T10:00:00Z",
      currentOwnership: {
        ownershipProvider: "clawkey",
        verifiedAt: "2026-03-15T10:05:00Z",
        expiresAt: null,
      },
    },
    {
      agentId: "agt_demo2",
      displayName: "Harbor Watch",
      handleLabel: "harbor-watch.clawitzer",
      status: "pending",
      createdAt: "2026-04-02T09:30:00Z",
      currentOwnership: null,
    },
  ],
  canRegister: false,
  registrationState: { kind: "idle" },
  showTitle: true,
};

const domainsFixture: DomainsTabProps = {
  currentHandle: "captainblackbeard.pirate",
  handleTier: "standard",
  redditImportDone: false,
  phase: "buy_name",
  redditVerification: {
    usernameValue: "",
    verificationState: "not_started",
  },
  importJob: {
    status: "not_started",
  },
  buyNameValue: "blackbeard",
};

function StatefulProfilePanel({
  fixture,
}: {
  fixture: SettingsPageProps["profile"];
}) {
  const [displayName, setDisplayName] = React.useState(fixture.displayName);
  const [bio, setBio] = React.useState(fixture.bio);
  const [primaryHandleId, setPrimaryHandleId] = React.useState<string | null>(
    fixture.primaryHandleId ?? null,
  );
  const [handleDraft, setHandleDraft] = React.useState(fixture.handleFlow?.draft ?? "");
  const selectedPostAuthorLabel = fixture.linkedHandles.find((handle) => (
    (handle.handleId ?? "pirate") === (primaryHandleId ?? "pirate")
  ))?.label ?? fixture.currentHandle;

  return (
    <ProfileTab
      profile={{
        ...fixture,
        bio,
        displayName,
        handleFlow: fixture.handleFlow
          ? {
              ...fixture.handleFlow,
              draft: handleDraft,
              preview: handleDraft ? `${handleDraft}.pirate` : "",
              setDraft: setHandleDraft,
            }
          : undefined,
        primaryHandleId,
        postAuthorLabel: selectedPostAuthorLabel,
        onBioChange: setBio,
        onDisplayNameChange: setDisplayName,
        onPrimaryHandleChange: setPrimaryHandleId,
      }}
    />
  );
}

function StatefulPreferencesPanel({
  fixture,
}: {
  fixture: SettingsPageProps["preferences"];
}) {
  const [locale, setLocale] = React.useState(fixture.locale);
  const [nationalityBadgeEnabled, setNationalityBadgeEnabled] = React.useState(
    fixture.nationalityBadgeEnabled ?? false,
  );

  return (
    <PreferencesTab
      preferences={{
        ...fixture,
        locale,
        nationalityBadgeEnabled,
        onLocaleChange: setLocale,
        onNationalityBadgeChange: setNationalityBadgeEnabled,
      }}
    />
  );
}

export const Profile: Story = {
  render: () => <StatefulProfilePanel fixture={profileFixture} />,
};

export const ProfileSaveError: Story = {
  render: () => (
    <StatefulProfilePanel
      fixture={{
        ...profileFixture,
        bio: "Making internet-native spaces for music and culture. This edit failed to save.",
        bioSource: "manual",
        submitState: {
          kind: "error",
          message: "Profile changes could not be saved. Try again.",
        },
      }}
    />
  ),
};

export const Preferences: Story = {
  render: () => <StatefulPreferencesPanel fixture={preferencesFixture} />,
};

export const PreferencesError: Story = {
  render: () => (
    <StatefulPreferencesPanel
      fixture={{
        ...preferencesFixture,
        locale: "ar",
        submitState: {
          kind: "error",
          message: "Preferences could not be saved. Try again.",
        },
      }}
    />
  ),
};

export const AgentsPopulated: Story = {
  render: () => <AgentsTab agents={agentsFixture} />,
};

export const AgentsEmpty: Story = {
  render: () => (
    <AgentsTab
      agents={{
        ...agentsFixture,
        items: [],
        canRegister: true,
      }}
    />
  ),
};

export const DomainsDefault: Story = {
  render: () => <DomainsTab {...domainsFixture} />,
};
