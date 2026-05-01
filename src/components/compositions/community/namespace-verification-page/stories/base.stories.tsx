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

const ownerManagedRecordsCallbacks: NamespaceVerificationCallbacks = {
  ...mockNamespaceCallbacks,
  onCompleteSession: async () => ({
    status: "challenge_pending",
    namespaceVerificationId: null,
    failureReason: null,
  }),
  onGetSession: async ({ namespaceVerificationSessionId }) => ({
    namespaceVerificationSessionId,
    family: "hns",
    rootLabel: "infinity",
    challengeHost: "_pirate.infinity",
    challengeTxtValue: "pirate-verification=nvs_infinity_records",
    challengePayload: null,
    challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "challenge_required",
    operationClass: null,
    pirateDnsAuthorityVerified: false,
    setupNameservers: mockPirateNameservers,
  }),
};

export const OwnerManagedRecords: Story = {
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={ownerManagedRecordsCallbacks}
      initialRootLabel="infinity"
    />
  ),
};
