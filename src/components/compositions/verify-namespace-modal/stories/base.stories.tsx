import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";
import { VerifyNamespaceModal } from "../verify-namespace-modal";
import type { NamespaceVerificationCallbacks } from "../verify-namespace-modal.types";

const mockCallbacks: NamespaceVerificationCallbacks = {
  onStartSession: async ({ rootLabel }) => ({
    namespaceVerificationSessionId: `nvs_${rootLabel}_stub`,
    challengeHost: `_pirate.${rootLabel}`,
    challengeTxtValue: `pirate-verification=stub-session-id`,
    challengeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "challenge_required",
  }),
  onCompleteSession: async ({ restartChallenge }) => {
    if (restartChallenge) {
      return {
        status: "challenge_required",
        namespaceVerificationId: null,
        failureReason: null,
      };
    }
    return {
      status: "verified",
      namespaceVerificationId: "nv_verified_stub",
      failureReason: null,
    };
  },
};

function ModalShell({
  forceMobile,
  initialRootLabel,
  callbacks = mockCallbacks,
}: {
  forceMobile?: boolean;
  initialRootLabel?: string;
  callbacks?: NamespaceVerificationCallbacks;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="flex min-h-[720px] items-center justify-center bg-background p-6">
      {!open ? <Button onClick={() => setOpen(true)}>Reopen modal</Button> : null}
      <VerifyNamespaceModal
        callbacks={callbacks}
        forceMobile={forceMobile}
        initialRootLabel={initialRootLabel}
        onOpenChange={setOpen}
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
