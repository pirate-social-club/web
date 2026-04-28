import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityNamespaceVerificationPage } from "@/components/compositions/community/namespace-verification-page/community-namespace-verification-page";
import {
  mockNamespaceCallbacks,
  mockPirateNameservers,
} from "@/components/compositions/community/moderation-shell/stories/story-fixtures";
import type { NamespaceVerificationCallbacks } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

const meta = {
  title: "Compositions/Community/Moderation/Namespace",
  component: CommunityNamespaceVerificationPage,
  args: {
    callbacks: mockNamespaceCallbacks,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityNamespaceVerificationPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const dnsSetupCallbacks: NamespaceVerificationCallbacks = {
  ...mockNamespaceCallbacks,
  onGetSession: async ({ namespaceVerificationSessionId }) => ({
    namespaceVerificationSessionId,
    family: "hns",
    rootLabel: "infinity",
    challengeHost: null,
    challengeTxtValue: null,
    challengePayload: null,
    challengeExpiresAt: null,
    status: "dns_setup_required",
    operationClass: null,
    pirateDnsAuthorityVerified: false,
    setupNameservers: mockPirateNameservers,
  }),
};

const pirateManagedCallbacks: NamespaceVerificationCallbacks = {
  ...mockNamespaceCallbacks,
  onGetSession: async ({ namespaceVerificationSessionId }) => ({
    namespaceVerificationSessionId,
    family: "hns",
    rootLabel: "infinity",
    challengeHost: "_pirate.infinity",
    challengeTxtValue: "pirate-verification=nvs_live_stub",
    challengePayload: null,
    challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "challenge_pending",
    operationClass: "pirate_delegated_namespace",
    pirateDnsAuthorityVerified: true,
    setupNameservers: mockPirateNameservers,
  }),
};

export const OwnerManagedTxt: Story = {
  render: () => (
    <CommunityNamespaceVerificationPage
      callbacks={mockNamespaceCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const DnsSetupRequired: Story = {
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_dns_setup_stub"
      callbacks={dnsSetupCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const PirateManagedDelegation: Story = {
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_pirate_managed_stub"
      callbacks={pirateManagedCallbacks}
      initialRootLabel="infinity"
    />
  ),
};
