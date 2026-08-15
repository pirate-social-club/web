import type { JSX } from "@solidjs/web";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, within } from "storybook/test";

import { SidebarProvider, Type } from "../../design-system";

import {
  AppShellHeader,
  AppShellMobileNav,
  type ShellRoute,
  type ShellViewer,
} from "./app-shell-header";
import { RootErrorBoundary } from "./root-error-boundary";
import { RouteContentFallback } from "./route-content-fallback";

const communityRoute: ShellRoute = {
  kind: "community",
  path: "/c/builders",
  communityId: "cmt_builders",
};
const postRoute: ShellRoute = { kind: "post", path: "/posts/post_123" };

const storyViewer: ShellViewer = {
  id: "usr_story",
  handleLabel: "story.pirate",
};

const meta = {
  title: "App/Shell/AppShell",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Shell chrome adapters over the DS AppHeader and MobileFooterNav: route-derived titles, back/create affordances, and unread badges. Navigation and auth are host callbacks; the viewer arrives as a prop (the React version read the session store and Privy runtime).",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function ShellFrame(props: { children: JSX.Element }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div class="min-h-screen w-full min-w-0 bg-background text-foreground">
        {props.children}
      </div>
    </SidebarProvider>
  );
}

export const MobileHeaderBack: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <ShellFrame>
      <AppShellHeader route={postRoute} unreadNotificationCount={0} viewer={storyViewer} />
    </ShellFrame>
  ),
};

export const MobileFooter: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <ShellFrame>
      <div class="min-h-screen pb-24">
        <Type as="p" class="p-5" variant="caption">
          Mobile footer shell area
        </Type>
        <AppShellMobileNav
          route={communityRoute}
          unreadNotificationCount={0}
          viewer={storyViewer}
        />
      </div>
    </ShellFrame>
  ),
};

export const MobileFooterWithNotifications: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <ShellFrame>
      <div class="min-h-screen pb-24">
        <Type as="p" class="p-5" variant="caption">
          Mobile footer shell area
        </Type>
        <AppShellMobileNav
          route={communityRoute}
          unreadNotificationCount={12}
          viewer={storyViewer}
        />
      </div>
    </ShellFrame>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Inbox, 12" }),
    ).toBeVisible();
  },
};

export const MobileFooterWithChatNotification: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => (
    <ShellFrame>
      <div class="min-h-screen pb-24">
        <Type as="p" class="p-5" variant="caption">
          Mobile footer shell area
        </Type>
        <AppShellMobileNav
          route={communityRoute}
          unreadChatCount={1}
          unreadNotificationCount={0}
          viewer={storyViewer}
        />
      </div>
    </ShellFrame>
  ),
};

export const RouteFallback: Story = {
  render: () => (
    <ShellFrame>
      <RouteContentFallback route={communityRoute} />
    </ShellFrame>
  ),
};

function BrokenChild(): JSX.Element {
  throw new Error("Story render failure");
}

export const RootError: Story = {
  render: () => (
    <ShellFrame>
      <RootErrorBoundary
        description="The app failed to initialize. Please try reloading the page."
        homeLabel="Go Home"
        title="Something went wrong?"
      >
        <BrokenChild />
      </RootErrorBoundary>
    </ShellFrame>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Something went wrong?"),
    ).toBeVisible();
  },
};
