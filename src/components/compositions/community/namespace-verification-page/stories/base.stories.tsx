import type { Meta, StoryObj } from "@storybook/react-vite";

import { CommunityNamespaceVerificationPage } from "@/components/compositions/community/namespace-verification-page/community-namespace-verification-page";
import {
  mockNamespaceCallbacks,
  mockPirateNameservers,
} from "@/components/compositions/community/moderation-shell/stories/story-fixtures";
import type {
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
  NamespaceVerificationStatus,
} from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

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

function hnsSession(status: NamespaceVerificationStatus): NamespaceVerificationStartResult {
  return {
    namespaceVerificationSessionId: "nvs_infinity_records_stub",
    family: "hns",
    rootLabel: "infinity",
    challengeHost: "infinity",
    challengeTxtValue: "pirate-verification=nvs_infinity_records",
    challengePayload: null,
    challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status,
    operationClass: null,
    pirateDnsAuthorityVerified: false,
    setupNameservers: mockPirateNameservers,
  };
}

function hnsCallbacks(input: {
  sessionStatus: NamespaceVerificationStatus;
  completeStatus?: NamespaceVerificationStatus;
  failureReason?: string;
  neverResolveSession?: boolean;
}): NamespaceVerificationCallbacks {
  return {
    ...mockNamespaceCallbacks,
    onCompleteSession: async () => ({
      status: input.completeStatus ?? "challenge_pending",
      namespaceVerificationId: null,
      failureReason: input.completeStatus === "failed" ? input.failureReason ?? "challenge_not_published" : null,
    }),
    onGetSession: input.neverResolveSession
      ? async () => new Promise<NamespaceVerificationStartResult>(() => undefined)
      : async () => hnsSession(input.sessionStatus),
  };
}

const ownerManagedRecordsCallbacks = hnsCallbacks({
  sessionStatus: "challenge_required",
  completeStatus: "challenge_pending",
});

const checkingRecordsCallbacks = hnsCallbacks({
  sessionStatus: "verifying",
});

const setupNotDetectedCallbacks = hnsCallbacks({
  sessionStatus: "dns_setup_required",
});

const verificationFailedCallbacks = hnsCallbacks({
  sessionStatus: "failed",
});

const txtMismatchCallbacks = hnsCallbacks({
  sessionStatus: "failed",
  completeStatus: "failed",
  failureReason: "challenge_mismatch",
});

export const OwnerManagedRecords: Story = {
  name: "HNS — Ready",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={ownerManagedRecordsCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const CheckingRecords: Story = {
  name: "HNS — Checking",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={checkingRecordsCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const RecordsNotFound: Story = {
  name: "HNS — Records not found",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={setupNotDetectedCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const VerificationError: Story = {
  name: "HNS — TXT missing",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={verificationFailedCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const TxtMismatch: Story = {
  name: "HNS — TXT mismatch",
  render: () => (
    <CommunityNamespaceVerificationPage
      activeSessionId="nvs_infinity_records_stub"
      callbacks={txtMismatchCallbacks}
      initialRootLabel="infinity"
    />
  ),
};

export const AttachedNamespace: Story = {
  name: "Connected",
  render: () => (
    <CommunityNamespaceVerificationPage
      attachedNamespaceVerificationId="nvs_abc123"
      attachedRouteSlug="@xx"
      callbacks={mockNamespaceCallbacks}
      onBackClick={() => undefined}
    />
  ),
};
