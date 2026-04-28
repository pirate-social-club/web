import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { getUniversalLink, SelfAppBuilder } from "@selfxyz/sdk-common";

import { Button } from "@/components/primitives/button";

import { SelfVerificationModal } from "../self-verification-modal";

const SELF_APP = new SelfAppBuilder({
  appName: "Pirate",
  endpoint: "https://api.pirate.test/verification-sessions/ver_story/self-callback",
  endpointType: "staging_https",
  scope: "community_join",
  sessionId: "ss_story",
  userId: "00000000-0000-4000-8000-000000000001",
  userIdType: "uuid",
  disclosures: { nationality: true },
  version: 2,
}).build();

const SELF_LAUNCH_HREF = getUniversalLink(SELF_APP);

const meta = {
  title: "Compositions/Verification/SelfVerificationModal",
  component: SelfVerificationModal,
  args: {
    actionLabel: "Open Self.xyz",
    description: "Self.xyz lets you prove facts like age and nationality without sharing your name, photo, or document details with anyone.",
    error: null,
    href: SELF_LAUNCH_HREF,
    onOpenChange: () => {},
    onQrError: () => {},
    onQrSuccess: () => {},
    open: true,
    selfApp: SELF_APP,
    title: "Verify with ID",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="min-h-[720px] bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelfVerificationModal>;

export default meta;

type Story = StoryObj<typeof meta>;

function ModalStory({
  error = null,
  forceMobile = false,
}: {
  error?: string | null;
  forceMobile?: boolean;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen verification</Button> : null}
      <SelfVerificationModal
        actionLabel="Open Self.xyz"
        description="Self.xyz lets you prove facts like age and nationality without sharing your name, photo, or document details with anyone."
        error={error}
        forceMobile={forceMobile}
        href={SELF_LAUNCH_HREF}
        onOpenChange={setOpen}
        onQrError={() => {}}
        onQrSuccess={() => {}}
        open={open}
        selfApp={SELF_APP}
        title="Verify with ID"
      />
    </>
  );
}

export const DesktopLaunch: Story = {
  name: "Desktop / Provider launch",
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <ModalStory />,
};

export const MobileDeeplink: Story = {
  name: "Mobile / Deeplink + Install Links",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ModalStory forceMobile />,
};

export const MobileInstallLinks: Story = {
  name: "Mobile / Install links",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ModalStory forceMobile />,
};

export const MobileError: Story = {
  name: "Mobile / Error",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ModalStory error="Verification session expired. Please try again." forceMobile />,
};
