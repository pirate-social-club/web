import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { SelfVerificationView } from "@/components/compositions/self-verification/self-verification-view";

import { VerificationCenterShell } from "../verification-center-shell";

const pendingSession = (
  <div className="space-y-4">
    <SelfVerificationView
      actions={{
        footer: { label: "Refresh status", onClick: () => {} },
      }}
      description="Use Very for the palm-backed path. This is the route that should satisfy ucommunity join requirements."
      entry={{ kind: "link", label: "Open Very QR", onClick: () => {} }}
      phase="ready"
      statusNote="Waiting for the Very palm scan to finish."
      title="Palm scan with Very"
    />
  </div>
);

const meta = {
  title: "Compositions/VerificationCenter",
  component: VerificationCenterShell,
  args: {
    choices: [
      {
        actionLabel: "Palm scan with Very",
        active: true,
        body: "Use Very for the palm-backed path. This is the route that should satisfy ucommunity join requirements.",
        note: "Use this first if you need palm-only access.",
        onAction: () => {},
        title: "Palm scan with Very",
      },
      {
        actionLabel: "Passport scan with Self",
        body: "Use Self for document-backed checks. Scan the QR with the Self app or open the mobile link directly.",
        note: "Use this if you want document-based checks on the same Pirate account.",
        onAction: () => {},
        title: "Passport scan with Self",
      },
    ],
    details: [
      { label: "Browser session", value: "Connected" },
      { label: "Unique human", value: "Pending" },
      { label: "Active provider", value: "very" },
      { label: "Session status", value: "Pending" },
    ],
    detailsTitle: "Account status",
    guidanceBody: "Finish both. Very unlocks palm-only ucommunities. Self covers passport and document-based qualifiers.",
    guidanceTitle: "Recommended",
    sessionBody: "Keep this page open while the provider finishes. The session panel will refresh automatically, and you can always reopen the QR flow.",
    sessionContent: pendingSession,
    sessionTitle: "Current verification session",
  },
} satisfies Meta<typeof VerificationCenterShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-[72rem]">
      <VerificationCenterShell {...args} />
    </div>
  ),
};
