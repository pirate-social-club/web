import type { Meta, StoryObj } from "@storybook/react-vite";
import type { SessionExchangeResponse } from "@pirate/api-contracts";
import * as React from "react";
import type { ReactElement } from "react";
import type { ReactNode } from "react";

import type { AppRoute } from "@/app/router";
import { SidebarProvider } from "@/components/compositions/system/sidebar/sidebar";
import { Type } from "@/components/primitives/type";
import { clearSession, setSession } from "@/lib/api/session-store";
import { getLocaleMessages } from "@/locales";

import { AppShellHeader, AppShellMobileNav } from "../app-shell-header";
import { RootErrorBoundary } from "../root-error-boundary";
import { RouteContentFallback } from "../route-content-fallback";

const copy = getLocaleMessages("en", "shell");
const homeRoute: AppRoute = { kind: "home", path: "/" };
const communityRoute: AppRoute = { kind: "community", path: "/c/builders", communityId: "cmt_builders" };
const postRoute: AppRoute = { kind: "post", path: "/posts/post_123", postId: "post_123" };
const storyCapabilities: SessionExchangeResponse["user"]["verification_capabilities"] = {
  age_over_18: { state: "verified" },
  gender: { state: "unverified" },
  minimum_age: { state: "verified" },
  nationality: { state: "unverified" },
  unique_human: { state: "verified" },
  wallet_score: { state: "unverified" },
};
const storySession: SessionExchangeResponse = {
  access_token: "story-token",
  onboarding: {
    cleanup_rename_available: false,
    community_creation_ready: true,
    generated_handle_assigned: false,
    missing_requirements: [],
    namespace_verification_status: "not_started",
    reddit_import_status: "succeeded",
    reddit_verification_status: "verified",
    unique_human_verification_status: "verified",
  },
  profile: {
    id: "usr_story",
    object: "profile",
    created: Date.parse("2026-04-26T15:30:00.000Z"),
    global_handle: {
      id: "gh_story",
      object: "global_handle",
      issuance_source: "generated_signup",
      issued_at: Date.parse("2026-04-26T15:30:00.000Z"),
      label: "story.pirate",
      status: "active",
      tier: "standard",
    },
    primary_wallet_address: "0x1111111111111111111111111111111111111111",
  },
  user: {
    id: "usr_story",
    object: "user",
    created: Date.parse("2026-04-26T15:30:00.000Z"),
    verification_capabilities: storyCapabilities,
    verification_state: "verified",
  },
  wallet_attachments: [
    {
      chain_namespace: "eip155",
      is_primary: true,
      wallet_address: "0x1111111111111111111111111111111111111111",
      wallet_attachment: "wa_story",
    },
  ],
};

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen w-full min-w-0 bg-background text-foreground">
        {children}
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedShellFrame({ children }: { children: ReactNode }) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setSession(storySession);
    setReady(true);
    return () => {
      clearSession();
    };
  }, []);

  return <ShellFrame>{ready ? children : null}</ShellFrame>;
}

function BrokenChild(): ReactElement {
  throw new Error("Story render failure");
}

const meta = {
  title: "App/Shell",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DesktopHeader: Story = {
  render: () => (
    <ShellFrame>
      <AppShellHeader copy={copy} route={homeRoute} unreadNotificationCount={0} />
    </ShellFrame>
  ),
};

export const DesktopHeaderWithNotifications: Story = {
  render: () => (
    <AuthenticatedShellFrame>
      <AppShellHeader copy={copy} route={homeRoute} unreadNotificationCount={12} />
    </AuthenticatedShellFrame>
  ),
};

export const DesktopHeaderWithChatNotification: Story = {
  render: () => (
    <AuthenticatedShellFrame>
      <AppShellHeader copy={copy} route={homeRoute} unreadChatCount={1} unreadNotificationCount={0} />
    </AuthenticatedShellFrame>
  ),
};

export const MobileHeaderBack: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <ShellFrame>
      <AppShellHeader copy={copy} route={postRoute} unreadNotificationCount={0} />
    </ShellFrame>
  ),
};

export const MobileFooter: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <ShellFrame>
      <div className="min-h-screen pb-24">
        <Type as="p" className="p-5" variant="caption">
          Mobile footer shell area
        </Type>
        <AppShellMobileNav copy={copy} route={communityRoute} unreadNotificationCount={0} />
      </div>
    </ShellFrame>
  ),
};

export const MobileFooterWithNotifications: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <AuthenticatedShellFrame>
      <div className="min-h-screen pb-24">
        <Type as="p" className="p-5" variant="caption">
          Mobile footer shell area
        </Type>
        <AppShellMobileNav copy={copy} route={communityRoute} unreadNotificationCount={12} />
      </div>
    </AuthenticatedShellFrame>
  ),
};

export const MobileFooterWithChatNotification: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <AuthenticatedShellFrame>
      <div className="min-h-screen pb-24">
        <Type as="p" className="p-5" variant="caption">
          Mobile footer shell area
        </Type>
        <AppShellMobileNav copy={copy} route={communityRoute} unreadChatCount={1} unreadNotificationCount={0} />
      </div>
    </AuthenticatedShellFrame>
  ),
};

export const RouteFallback: Story = {
  render: () => (
    <ShellFrame>
      <RouteContentFallback route={communityRoute} />
    </ShellFrame>
  ),
};

export const RootError: Story = {
  render: () => (
    <ShellFrame>
      <RootErrorBoundary
        description={copy.rootError.description}
        homeLabel={copy.rootError.homeLabel}
        resetKey="/broken"
        title={copy.rootError.title}
      >
        <BrokenChild />
      </RootErrorBoundary>
    </ShellFrame>
  ),
};
