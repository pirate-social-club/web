import type { Meta, StoryObj } from "@storybook/react-vite";

import { PwaInstallPromo } from "@/components/compositions/pwa/pwa-install-promo";
import { Card } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { getLocaleMessages } from "@/locales";

const copy = getLocaleMessages("en", "routes").inbox;

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Card className="px-5 py-4">
          <Type as="p" variant="label">Activity</Type>
        </Card>
        {children}
        <Card className="px-5 py-4">
          <Type as="p" className="text-muted-foreground" variant="body">
            Notification rows continue below the install promo.
          </Type>
        </Card>
      </div>
    </div>
  );
}

const meta = {
  title: "Compositions/PWA/Install Promo",
  component: PwaInstallPromo,
  args: {
    title: copy.installPromoTitle,
    body: copy.installPromoBody,
    installLabel: copy.installPromoAction,
    surface: "inbox",
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PwaInstallPromo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InboxNativePrompt: Story = {
  render: () => (
    <StoryFrame>
      <PwaInstallPromo
        title={copy.installPromoTitle}
        body={copy.installPromoBody}
        installLabel={copy.installPromoAction}
        iosInstructions={copy.installPromoIOSInstructions}
        previewState="default"
        surface="inbox"
        trigger="inbox"
        unreadCount={4}
      />
    </StoryFrame>
  ),
};

export const InboxIOSInstructions: Story = {
  render: () => (
    <StoryFrame>
      <PwaInstallPromo
        title={copy.installPromoTitle}
        body={copy.installPromoBody}
        installLabel={copy.installPromoAction}
        iosInstructions={copy.installPromoIOSInstructions}
        previewState="ios_instructions"
        surface="inbox"
        trigger="inbox"
        unreadCount={4}
      />
    </StoryFrame>
  ),
};

export const MobileInboxNativePrompt: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <StoryFrame>
      <PwaInstallPromo
        title={copy.installPromoTitle}
        body={copy.installPromoBody}
        installLabel={copy.installPromoAction}
        iosInstructions={copy.installPromoIOSInstructions}
        previewState="default"
        surface="inbox"
        trigger="inbox"
        unreadCount={12}
      />
    </StoryFrame>
  ),
};
