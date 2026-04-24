import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/primitives/button";

import { SelfVerificationModal } from "../self-verification-modal";

const SELF_LAUNCH_HREF = "https://redirect.self.xyz/?selfApp=%7B%22appName%22%3A%22Pirate%22%2C%22endpoint%22%3A%22https%3A%2F%2Fapi.pirate.test%2Fverification-sessions%2Fver_story%2Fself-callback%22%2C%22endpointType%22%3A%22staging_https%22%2C%22scope%22%3A%22community_join%22%2C%22sessionId%22%3A%22ss_story%22%2C%22userId%22%3A%2200000000-0000-4000-8000-000000000001%22%2C%22userIdType%22%3A%22uuid%22%2C%22disclosures%22%3A%7B%22nationality%22%3Atrue%7D%2C%22version%22%3A2%7D";

const meta = {
  title: "Compositions/SelfVerificationModal",
  component: SelfVerificationModal,
  args: {
    actionLabel: "Open Self",
    description: "Use Self to verify your document privately and return to Pirate when the check is complete.",
    error: null,
    href: SELF_LAUNCH_HREF,
    loading: false,
    onOpenChange: () => {},
    open: true,
    qrValue: SELF_LAUNCH_HREF,
    title: "Verify with Self",
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
  loading = false,
}: {
  error?: string | null;
  loading?: boolean;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Reopen verification</Button> : null}
      <SelfVerificationModal
        actionLabel="Open Self"
        description="Use Self to verify your document privately and return to Pirate when the check is complete."
        error={error}
        href={SELF_LAUNCH_HREF}
        loading={loading}
        onOpenChange={setOpen}
        open={open}
        qrValue={SELF_LAUNCH_HREF}
        title="Verify with Self"
      />
    </>
  );
}

export const DesktopQr: Story = {
  name: "Desktop / QR",
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
  render: () => <ModalStory />,
};

export const MobileLoading: Story = {
  name: "Mobile / Processing",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ModalStory loading />,
};

export const MobileError: Story = {
  name: "Mobile / Error",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ModalStory error="Verification session expired. Please try again." />,
};
