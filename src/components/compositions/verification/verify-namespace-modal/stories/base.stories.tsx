import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";

import { VerifyNamespaceModalView } from "../verify-namespace-modal.view";

const noop = () => undefined;

const baseArgs = {
  activeFamily: "hns",
  busy: false,
  canStart: true,
  canSubmitSignature: false,
  challengeHost: null,
  challengePayload: null,
  challengeTxtValue: null,
  failureReason: null,
  hnsMode: null,
  isChallengePending: false,
  isChallengeReady: false,
  isDnsSetupRequired: false,
  isExpired: false,
  isFailed: false,
  isHns: true,
  isIdle: true,
  isSpaces: false,
  isStarting: false,
  isVerified: false,
  isVerifying: false,
  onAbandon: noop,
  onFamilyChange: noop,
  onOpenChange: noop,
  onRestart: noop,
  onRootLabelChange: noop,
  onSignatureChange: noop,
  onStart: noop,
  onVerify: noop,
  open: true,
  resuming: false,
  rootLabel: "builders",
  rootLabelError: null,
  routePreviewPath: "/c/builders",
  setupNameservers: null,
  signature: "",
} satisfies ComponentProps<typeof VerifyNamespaceModalView>;

const spacesChallenge = {
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
} as const;

const meta = {
  title: "Compositions/Verification/VerifyNamespaceModal",
  component: VerifyNamespaceModalView,
  args: baseArgs,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof VerifyNamespaceModalView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChooseNamespace: Story = {};

export const HandshakeChallengeReady: Story = {
  args: {
    ...baseArgs,
    canSubmitSignature: true,
    challengeHost: "builders",
    challengeTxtValue: "pirate-verification=nvs_abc123",
    hnsMode: "owner_managed_txt",
    isChallengeReady: true,
    isIdle: false,
    setupNameservers: ["ns1.pirate.", "ns2.pirate."],
  },
};

export const SpacesChallengePending: Story = {
  args: {
    ...baseArgs,
    activeFamily: "spaces",
    canSubmitSignature: true,
    challengePayload: spacesChallenge,
    isChallengePending: true,
    isHns: false,
    isIdle: false,
    isSpaces: true,
  },
};

export const Verified: Story = {
  args: {
    ...baseArgs,
    isIdle: false,
    isVerified: true,
  },
};

export const Failed: Story = {
  args: {
    ...baseArgs,
    failureReason: "txt_record_not_found",
    hnsMode: "owner_managed_txt",
    isFailed: true,
    isIdle: false,
  },
};
