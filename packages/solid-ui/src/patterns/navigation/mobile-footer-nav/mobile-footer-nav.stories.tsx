import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Type } from "@/components/data-display/type/type";

import { MobileFooterNav } from "./mobile-footer-nav";

const meta = {
  title: "Patterns/Navigation/MobileFooterNav",
  component: MobileFooterNav,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Fixed mobile bottom navigation: home, wallet, chat, inbox (with unread badges), and profile avatar. Item presses report through callbacks, tap haptics arrive via onTapHaptic, and copy via labels. Renders nothing on desktop unless forceMobile is set.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ "min-height": "100vh", width: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MobileFooterNav>;

export default meta;

type Story = StoryObj<typeof meta>;

function FooterOnlyStory(props: { unreadInboxCount?: number }) {
  return (
    <div class="min-h-screen bg-background px-3 pb-28 pt-6">
      <Type
        as="div"
        variant="caption"
        class="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5"
      >
        Content body clearing the fixed footer.
      </Type>
      <MobileFooterNav
        activeItem="inbox"
        forceMobile
        unreadInboxCount={props.unreadInboxCount ?? 0}
      />
    </div>
  );
}

const mobileGlobals = {
  viewport: { value: "mobile1", isRotated: false },
};

export const MobileFooter: Story = {
  globals: mobileGlobals,
  render: () => <FooterOnlyStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Home" }));
    await expect(
      canvas.getByRole("button", { name: "Inbox" }),
    ).toHaveAttribute("aria-current", "page");
  },
};

export const MobileFooterRtl: Story = {
  globals: { ...mobileGlobals, direction: "rtl" },
  render: () => <FooterOnlyStory />,
};

export const MobileFooterWithSingleNotification: Story = {
  globals: mobileGlobals,
  render: () => <FooterOnlyStory unreadInboxCount={1} />,
};

export const MobileFooterWithNotifications: Story = {
  globals: mobileGlobals,
  render: () => <FooterOnlyStory unreadInboxCount={12} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Inbox, 12" }),
    ).toBeVisible();
  },
};

export const MobileFooterOverflowNotifications: Story = {
  globals: mobileGlobals,
  render: () => <FooterOnlyStory unreadInboxCount={120} />,
  play: async ({ canvasElement }) => {
    const badge = canvasElement.querySelector(".notification-count-badge");
    await expect(badge).toHaveTextContent("99+");
  },
};
