import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";
import { VerifyNamespaceModal } from "../verify-namespace-modal";
import type { NamespaceVerificationCallbacks } from "../verify-namespace-modal.types";

const mockCallbacks: NamespaceVerificationCallbacks = {
  onStartSession: async ({ family, rootLabel }) => {
    if (family === "spaces") {
      return {
        namespaceVerificationSessionId: `nvs_${rootLabel}_spaces_stub`,
        family: "spaces",
        rootLabel,
        challengeHost: null,
        challengeTxtValue: null,
        challengePayload: {
          kind: "schnorr_sign",
          domain: "pirate.sc",
          root_label: rootLabel,
          root_pubkey: "stub_root_pubkey",
          nonce: "pirate-space-verify=stub-session-id:abc123",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          message: `pirate.space.verify\nroot=@${rootLabel}\nroot_pubkey=stub_root_pubkey\nnonce=pirate-space-verify=stub-session-id:abc123\nissued_at=${new Date().toISOString()}\nexpires_at=${new Date(Date.now() + 10 * 60 * 1000).toISOString()}\ndomain=pirate.sc`,
          digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
        challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: "challenge_required",
      };
    }
    return {
      namespaceVerificationSessionId: `nvs_${rootLabel}_hns_stub`,
      family: "hns",
      rootLabel,
      challengeHost: `_pirate.${rootLabel}`,
      challengeTxtValue: `pirate-verification=stub-session-id`,
      challengePayload: null,
      challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "challenge_required",
    };
  },
  onCompleteSession: async ({ family, signaturePayload, restartChallenge }) => {
    if (restartChallenge) {
      return {
        status: "challenge_required",
        namespaceVerificationId: null,
        failureReason: null,
      };
    }
    if (family === "spaces" && signaturePayload) {
      return {
        status: "verified",
        namespaceVerificationId: "nv_spaces_verified_stub",
        failureReason: null,
      };
    }
    return {
      status: "verified",
      namespaceVerificationId: "nv_hns_verified_stub",
      failureReason: null,
    };
  },
  onGetSession: async ({ namespaceVerificationSessionId }) => {
    if (namespaceVerificationSessionId.includes("spaces")) {
      const rootLabel = namespaceVerificationSessionId.replace("nvs_", "").replace("_spaces_stub", "");
      return {
        namespaceVerificationSessionId,
        family: "spaces",
        rootLabel,
        challengeHost: null,
        challengeTxtValue: null,
        challengePayload: {
          kind: "schnorr_sign",
          domain: "pirate.sc",
          root_label: rootLabel,
          root_pubkey: "stub_root_pubkey",
          nonce: "pirate-space-verify=stub-session-id:abc123",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          message: `pirate.space.verify\nroot=@${rootLabel}\nroot_pubkey=stub_root_pubkey\nnonce=pirate-space-verify=stub-session-id:abc123\nissued_at=${new Date().toISOString()}\nexpires_at=${new Date(Date.now() + 10 * 60 * 1000).toISOString()}\ndomain=pirate.sc`,
          digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
        challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: "challenge_required",
      };
    }
    const rootLabel = namespaceVerificationSessionId.replace("nvs_", "").replace("_hns_stub", "");
    return {
      namespaceVerificationSessionId,
      family: "hns",
      rootLabel,
      challengeHost: `_pirate.${rootLabel}`,
      challengeTxtValue: `pirate-verification=stub-session-id`,
      challengePayload: null,
      challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "challenge_required",
    };
  },
};

function ModalShell({
  forceMobile,
  initialRootLabel,
  activeSessionId,
  callbacks = mockCallbacks,
}: {
  forceMobile?: boolean;
  initialRootLabel?: string;
  activeSessionId?: string | null;
  callbacks?: NamespaceVerificationCallbacks;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="flex min-h-[720px] items-center justify-center bg-background p-6">
      {!open ? <Button onClick={() => setOpen(true)}>Reopen modal</Button> : null}
      <VerifyNamespaceModal
        activeSessionId={activeSessionId}
        callbacks={callbacks}
        forceMobile={forceMobile}
        initialRootLabel={initialRootLabel}
        onOpenChange={setOpen}
        onSessionCleared={() => console.info("session cleared")}
        onSessionStarted={(id) => console.info("session started", id)}
        onVerified={(id) => console.info("verified", id)}
        open={open}
      />
    </div>
  );
}

const meta = {
  title: "Compositions/VerifyNamespaceModal",
  component: VerifyNamespaceModal,
  args: {
    open: true,
    onOpenChange: () => {},
    callbacks: mockCallbacks,
  },
} satisfies Meta<typeof VerifyNamespaceModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DesktopIdle: Story = {
  name: "Desktop / Idle",
  parameters: { viewport: { defaultViewport: "desktop" } },
  args: { forceMobile: false },
};

export const MobileIdle: Story = {
  name: "Mobile / Idle",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { forceMobile: true },
};

export const DesktopWithRoot: Story = {
  name: "Desktop / With Root Prefilled",
  parameters: { viewport: { defaultViewport: "desktop" } },
  args: { forceMobile: false, initialRootLabel: "american" },
};

export const SpacesChallengeReady: Story = {
  name: "Spaces / Challenge Ready",
  parameters: { viewport: { defaultViewport: "desktop" } },
  args: { forceMobile: false, initialRootLabel: "infinity", initialFamily: "spaces" as const },
};

export const HnsChallengeReady: Story = {
  name: "HNS / Challenge Ready",
  parameters: { viewport: { defaultViewport: "desktop" } },
  args: { forceMobile: false, initialRootLabel: "infinity" },
};

export const DesktopResuming: Story = {
  name: "Desktop / Resuming HNS Session",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => (
    <ModalShell activeSessionId="nvs_infinity_hns_stub" />
  ),
};
