import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { SelfVerificationModal } from "../self-verification-modal";
import type { SelfVerificationProps } from "../self-verification.types";

const qrPlaceholder = (
  <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/50 text-base text-muted-foreground">
    QR code
  </div>
);

const base: SelfVerificationProps = {
  phase: "sign_in",
  title: "Verify your identity",
  description: "Use Self to prove you are a unique human. This helps communities trust anonymous posts with verified qualifiers.",
  actions: {
    primary: { label: "Sign in", onClick: () => {} },
  },
};

const meta = {
  title: "Compositions/SelfVerification",
  component: SelfVerificationModal,
  args: { ...base, open: true, onOpenChange: () => {} },
} satisfies Meta<typeof SelfVerificationModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DesktopSignIn: Story = {
  name: "Desktop / Sign In",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => (
    <SelfVerificationModal
      {...base}
      forceMobile={false}
      onOpenChange={() => {}}
      open
    />
  ),
};

export const DesktopQrReady: Story = {
  name: "Desktop / QR Ready",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => (
    <SelfVerificationModal
      actions={{
        footer: { label: "Copy link instead", onClick: () => {} },
      }}
      description="Scan with the Self app to verify your identity."
      entry={{ kind: "qr", content: qrPlaceholder }}
      forceMobile={false}
      onOpenChange={() => {}}
      open
      phase="ready"
      title="Verify with Self"
    />
  ),
};

export const DesktopWaiting: Story = {
  name: "Desktop / Waiting",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => (
    <SelfVerificationModal
      actions={{}}
      description="Scan with the Self app to verify your identity."
      entry={{ kind: "qr", content: qrPlaceholder }}
      forceMobile={false}
      onOpenChange={() => {}}
      open
      phase="waiting"
      statusNote="Waiting for verification..."
      title="Verify with Self"
    />
  ),
};

export const DesktopVerified: Story = {
  name: "Desktop / Verified",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => (
    <SelfVerificationModal
      actions={{
        primary: { label: "Continue", onClick: () => {} },
      }}
      description="You are verified as a unique human. You can now post with identity qualifiers in supported communities."
      forceMobile={false}
      onOpenChange={() => {}}
      open
      phase="verified"
      title="Verified"
    />
  ),
};

export const DesktopError: Story = {
  name: "Desktop / Error",
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: () => (
    <SelfVerificationModal
      actions={{
        footer: { label: "Try again", onClick: () => {} },
      }}
      description="Use Self to prove you are a unique human."
      errorBody="The verification session could not be started. Please check your connection and try again."
      errorTitle="Something went wrong"
      forceMobile={false}
      onOpenChange={() => {}}
      open
      phase="error"
      title="Verify with Self"
    />
  ),
};

export const MobileOpenApp: Story = {
  name: "Mobile / Open App",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <SelfVerificationModal
      actions={{}}
      description="Open the Self app to complete verification."
      entry={{ kind: "link", label: "Open Self", onClick: () => {} }}
      forceMobile
      mobileSide="bottom"
      onOpenChange={() => {}}
      open
      phase="ready"
      title="Verify with Self"
    />
  ),
};

export const MobileWaiting: Story = {
  name: "Mobile / Waiting",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <SelfVerificationModal
      actions={{}}
      description="Return to this screen after completing verification in the Self app."
      forceMobile
      mobileSide="bottom"
      onOpenChange={() => {}}
      open
      phase="waiting"
      statusNote="Waiting for Self..."
      title="Verify with Self"
    />
  ),
};

export const MobileError: Story = {
  name: "Mobile / Error",
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => (
    <SelfVerificationModal
      actions={{
        footer: { label: "Try again", onClick: () => {} },
      }}
      description="Use Self to prove you are a unique human."
      errorBody="Verification failed. Please try again."
      errorTitle="Session expired"
      forceMobile
      mobileSide="bottom"
      onOpenChange={() => {}}
      open
      phase="error"
      title="Verify with Self"
    />
  ),
};


