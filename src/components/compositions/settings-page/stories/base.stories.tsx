import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsPage } from "../settings-page";
import type { SettingsPageProps, SettingsTab } from "../settings-page.types";
import type { HandleRenameState } from "@/hooks/use-global-handle-flow";
import { formatHandle, normalizeHandleLabel } from "@/lib/global-handle";

type MockHandleFlow = NonNullable<SettingsPageProps["profile"]["handleFlow"]>;

function InteractiveSettingsStory(args: SettingsPageProps) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(args.activeTab);
  const [displayName, setDisplayName] = React.useState(args.profile.displayName);
  const [bio, setBio] = React.useState(args.profile.bio);
  const [locale, setLocale] = React.useState(args.preferences.locale);
  const [primaryHandleId, setPrimaryHandleId] = React.useState<string | null>(
    args.profile.primaryHandleId ?? null,
  );
  const [handleDraft, setHandleDraft] = React.useState(args.profile.handleFlow?.draft ?? "");

  const normalizedHandleDraft = normalizeHandleLabel(handleDraft);
  const handleFlow = args.profile.handleFlow
    ? {
        ...args.profile.handleFlow,
        draft: handleDraft,
        preview: formatHandle(normalizedHandleDraft),
        setDraft: setHandleDraft,
      }
    : undefined;

  return (
    <SettingsPage
      {...args}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      preferences={{
        ...args.preferences,
        locale,
        onLocaleChange: setLocale,
      }}
      profile={{
        ...args.profile,
        bio,
        displayName,
        handleFlow,
        primaryHandleId,
        onBioChange: setBio,
        onDisplayNameChange: setDisplayName,
        onPrimaryHandleChange: setPrimaryHandleId,
      }}
    />
  );
}

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

const baseArgs: SettingsPageProps = {
  activeTab: "profile",
  agents: {
    items: [],
    canRegister: true,
    registrationState: { kind: "idle" },
  },
  profile: {
    avatarSrc: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
    bio: "Making internet-native spaces for music and culture.",
    coverSrc: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
    currentHandle: "captainblackbeard.pirate",
    displayName: "Blackbeard",
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
    postAuthorLabel: "captainblackbeard.pirate",
    submitState: { kind: "idle" },
  },
  wallet: {
    primaryAddress: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
    connectedWallets: [
      {
        address: "0x42a5f77f2d06c9a7e304817b3c177b91e0c2f3a8",
        chainLabel: "Ethereum",
        isPrimary: true,
      },
      {
        address: "0x11f4845ef4bb010f8aebf2772836e2d33f5e4cc1",
        chainLabel: "Base",
      },
    ],
  },
  preferences: {
    ageStatusLabel: "18+ verified",
    locale: "en",
    localeOptions: [
      { label: "English", value: "en" },
      { label: "Arabic", value: "ar" },
      { label: "Mandarin", value: "zh" },
      { label: "Pseudo", value: "pseudo" },
    ],
    submitState: { kind: "idle" },
  },
};

const meta = {
  title: "Compositions/SettingsPage",
  component: SettingsPage,
  args: baseArgs,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => <InteractiveSettingsStory {...args} />,
} satisfies Meta<typeof SettingsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Profile: Story = {};

export const Wallet: Story = {
  args: {
    activeTab: "wallet",
  },
};

export const Preferences: Story = {
  args: {
    activeTab: "preferences",
  },
};

export const Agents: Story = {
  args: {
    activeTab: "agents",
    agents: {
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
      ],
      canRegister: false,
      registrationState: { kind: "idle" },
      onUpdateHandle: async () => {},
    },
  },
};

export const ProfileHandleChangeIdle: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      handleFlow: makeMockHandleFlow({ draft: "" }),
    },
  },
};

export const ProfileHandleAvailableFree: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      handleFlow: makeMockHandleFlow({
        draft: "blackbeard",
        preview: "blackbeard.pirate",
        state: { kind: "available", freeRenameRemaining: true },
      }),
    },
  },
};

export const ProfileHandleAvailablePaid: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      handleFlow: makeMockHandleFlow({
        draft: "blackbeard",
        preview: "blackbeard.pirate",
        state: { kind: "available", freeRenameRemaining: false },
      }),
    },
  },
};

export const ProfileHandleUnavailable: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      handleFlow: makeMockHandleFlow({
        draft: "blackbeard",
        preview: "blackbeard.pirate",
        state: { kind: "unavailable", reason: "This handle is already taken." },
      }),
    },
  },
};

export const ProfileHandleChecking: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      handleFlow: makeMockHandleFlow({
        draft: "blackbeard",
        preview: "blackbeard.pirate",
        state: { kind: "checking" },
      }),
    },
  },
};

export const ProfileHandleSaving: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      handleFlow: makeMockHandleFlow({
        draft: "blackbeard",
        preview: "blackbeard.pirate",
        state: { kind: "saving" },
      }),
    },
  },
};

export const ProfileHandleSuccess: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      handleFlow: makeMockHandleFlow({
        draft: "blackbeard",
        preview: "blackbeard.pirate",
        state: { kind: "success", newHandle: "blackbeard.pirate" },
      }),
    },
  },
};

export const ProfileLinkedHandleStale: Story = {
  args: {
    profile: {
      ...baseArgs.profile,
      primaryHandleId: null,
      postAuthorLabel: "captainblackbeard.pirate",
      linkedHandles: [
        {
          handleId: null,
          kind: "pirate",
          label: "captainblackbeard.pirate",
          primary: false,
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
    },
  },
};

export const ProfileMobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
