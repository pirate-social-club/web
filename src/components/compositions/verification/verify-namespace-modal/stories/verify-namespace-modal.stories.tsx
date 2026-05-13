import type { Meta, StoryObj } from "@storybook/react-vite";

import { VerifyNamespaceModal } from "../verify-namespace-modal";
import type {
  NamespaceVerificationCallbacks,
  NamespaceVerificationStartResult,
  SpacesChallengePayload,
} from "../verify-namespace-modal.types";

const spacesChallenge: SpacesChallengePayload = {
  domain: "builders",
  expires_at: "2026-04-26T12:30:00.000Z",
  freedom_url: "https://freedom.pirate.dev/c/builders",
  issued_at: "2026-04-26T12:00:00.000Z",
  kind: "fabric_txt_publish",
  nonce: "nonce_123456789",
  root_label: "builders",
  root_pubkey: "0x1234567890abcdef",
  txt_key: "pirate-verify",
  txt_value: "verify_123456789",
  web_url: "https://pirate.dev/c/builders",
};

const challengeReadySession: NamespaceVerificationStartResult = {
  namespaceVerificationSessionId: "nvs_story_ready",
  family: "spaces",
  rootLabel: "builders",
  challengeHost: null,
  challengeTxtValue: null,
  challengePayload: spacesChallenge,
  challengeExpiresAt: spacesChallenge.expires_at,
  status: "challenge_required",
  operationClass: "owner_signed_updates_namespace",
  pirateDnsAuthorityVerified: null,
  setupNameservers: null,
};

const hnsDnsSetupSession: NamespaceVerificationStartResult = {
  namespaceVerificationSessionId: "nvs_story_dns",
  family: "hns",
  rootLabel: "kanye",
  challengeHost: "_pirate.kanye",
  challengeTxtValue: "pirate-verify=nvs_story_dns",
  challengePayload: null,
  challengeExpiresAt: null,
  status: "dns_setup_required",
  operationClass: "pirate_delegated_namespace",
  pirateDnsAuthorityVerified: false,
  setupNameservers: ["ns1.pirate.dev", "ns2.pirate.dev"],
};

const callbacks = {
  onStartSession: async ({ family, rootLabel }) => ({
    ...(family === "spaces" ? challengeReadySession : hnsDnsSetupSession),
    family,
    rootLabel,
  }),
  onCompleteSession: async () => ({
    status: "verified",
    namespaceVerificationId: "nv_story_verified",
    failureReason: null,
  }),
  onGetSession: async ({ namespaceVerificationSessionId }) =>
    namespaceVerificationSessionId === hnsDnsSetupSession.namespaceVerificationSessionId
      ? hnsDnsSetupSession
      : challengeReadySession,
} satisfies NamespaceVerificationCallbacks;

const meta = {
  title: "Compositions/Verification/VerifyNamespaceModal",
  component: VerifyNamespaceModal,
  args: {
    callbacks,
    open: true,
    onOpenChange: () => undefined,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof VerifyNamespaceModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    initialRootLabel: "kanye",
  },
};

export const SpacesChallengeReady: Story = {
  args: {
    activeSessionId: challengeReadySession.namespaceVerificationSessionId,
    initialFamily: "spaces",
    initialRootLabel: "builders",
  },
};

export const HnsDnsSetupRequired: Story = {
  args: {
    activeSessionId: hnsDnsSetupSession.namespaceVerificationSessionId,
    initialFamily: "hns",
    initialRootLabel: "kanye",
  },
};

export const Mobile: Story = {
  args: {
    forceMobile: true,
    initialRootLabel: "kanye",
  },
  parameters: {
    viewport: { defaultViewport: "mobile2" },
  },
};
