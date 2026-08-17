import type { Meta, StoryObj } from "storybook-solidjs-vite";

import {
  AppHeader,
  Button,
  IconBell,
  IconChatCircle,
  IconFlag,
  IconHouse,
  IconPlus,
  IconWallet,
  MobileFooterNav,
  SidebarInset,
  SidebarProvider,
  Type,
} from "../../design-system";

import {
  AppSidebar,
  type AppSidebarPrimaryItem,
  type AppSidebarSection,
} from "./app-sidebar";

const meta = {
  title: "App/Shell/AppSidebar",
  component: AppSidebar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Application sidebar composed on the DS Sidebar pattern. Feed-sort state, version SHAs, and all copy arrive as props (the React version subscribed to a window event, fetched /__version, and read locale messages). Locale-specific React stories are covered by the direction global.",
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
} satisfies Meta<typeof AppSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Mirrors the shipped media spine from the React app shell, with a seeded
    monogram avatar for Profile. */
function buildStorySpineItems(): AppSidebarPrimaryItem[] {
  return [
    { id: "home", icon: IconHouse, label: "Home" },
    {
      id: "activity",
      icon: IconBell,
      label: "Activity",
      badgeCount: 12,
    },
    {
      id: "chat",
      icon: IconChatCircle,
      label: "Chat",
      badgeCount: 1,
    },
    { id: "wallet", icon: IconWallet, label: "Wallet" },
    {
      id: "profile",
      icon: IconHouse,
      label: "Profile",
      avatarFallback: "story.pirate",
      avatarSeed: "usr_story",
      avatarSrc: null,
    },
  ];
}

const fixtureSections: AppSidebarSection[] = [
  {
    id: "communities",
    label: "Communities",
    defaultOpen: true,
    items: [
      { id: "c/pirate-radio", label: "c/pirate-radio" },
      { id: "c/builders", label: "c/builders" },
    ],
  },
];

const fixtureResourceItems = [
  { id: "docs", label: "Docs" },
  { id: "support", label: "Support" },
];

function ShellChrome(props: { mobile?: boolean; isRtl?: boolean }) {
  const sections = fixtureSections.map((section) => ({ ...section, defaultOpen: true }));

  if (props.mobile) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AppSidebar
          appearance="media"
          brandLabel="Pirate"
          homeAriaLabel="Go to home"
          isRtl={props.isRtl}
          primaryItems={buildStorySpineItems()}
          resourceItems={fixtureResourceItems}
          resourcesLabel="Resources"
          sections={sections}
          versionWebSha="c3b077c"
          versionApiSha="a1b2c3d"
        />
        <SidebarInset class="min-h-screen">
          <AppHeader useSidebarTrigger />
          <main class="space-y-3 px-3 pb-28 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <div class="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
              <div class="space-y-3">
                <div class="h-5 w-24 rounded-full bg-muted" />
                <div class="h-32 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
              </div>
            </div>
            <div class="rounded-[var(--radius-xl)] border border-border-soft bg-card p-5">
              <div class="space-y-3">
                <div class="h-5 w-36 rounded-full bg-muted" />
                <div class="h-24 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
              </div>
            </div>
          </main>
          <MobileFooterNav activeItem="home" />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        appearance="media"
        brandLabel="Pirate"
        homeAriaLabel="Go to home"
        isRtl={props.isRtl}
        primaryItems={buildStorySpineItems()}
        resourceItems={fixtureResourceItems}
        resourcesLabel="Resources"
        sections={sections}
        versionWebSha="c3b077c"
        versionApiSha="a1b2c3d"
      />
      <SidebarInset class="min-h-screen">
        <main class="mx-auto w-full max-w-5xl px-6 py-8">
          <div class="rounded-[var(--radius-xl)] border border-border-soft bg-card p-8">
            <div class="space-y-4">
              <div class="h-5 w-32 rounded-full bg-muted" />
              <div class="h-40 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
              <div class="h-28 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70" />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function MediaShellReview(props: {
  collapsed?: boolean;
  contentRoute?: boolean;
  dockOpen?: boolean;
  moderationRoute?: boolean;
  populatedCommunities?: boolean;
  overflowingCommunities?: boolean;
}) {
  const mediaSections: AppSidebarSection[] = [
    {
      action: { ariaLabel: "Create Community", icon: IconPlus, onSelect: () => undefined },
      defaultOpen: true,
      id: "communities",
      items: [
        { id: "your-communities", icon: IconFlag, label: "Your Communities" },
        ...(props.populatedCommunities
          ? [
              { id: "c/pirate-radio", label: "c/pirate-radio" },
              { id: "c/builders", label: "c/builders" },
            ]
          : []),
        ...(props.overflowingCommunities
          ? Array.from({ length: 8 }, (_unused, index) => ({
              id: `c/community-${index}`,
              label: `c/long-community-name-${index}`,
            }))
          : []),
      ],
      label: "Communities",
    },
  ];

  return (
    <SidebarProvider defaultOpen={!props.collapsed}>
      <AppSidebar
        activeItemId="home"
        appearance="media"
        brandLabel="Pirate"
        homeAriaLabel="Go to home"
        mediaAction={<Button class="w-full">Connect</Button>}
        onHomeClick={() => undefined}
        onSearchClick={() => undefined}
        primaryItems={buildStorySpineItems()}
        searchLabel="Search"
        sections={mediaSections}
        versionWebSha="c3b077c"
        versionApiSha="a1b2c3d"
      />
      <SidebarInset
        class={
          props.contentRoute
            ? "h-dvh min-h-0 overflow-hidden bg-background"
            : "h-dvh min-h-0 overflow-hidden bg-black"
        }
      >
        <main
          class={
            props.contentRoute
              ? "min-h-0 flex-1 overflow-auto p-8"
              : props.dockOpen
                ? "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_26rem]"
                : "min-h-0 flex-1"
          }
        >
          {props.contentRoute ? (
            <div class="mx-auto max-w-4xl space-y-5">
              <Type as="h1" variant="h2">
                {props.moderationRoute ? "Moderator tools" : "Settings"}
              </Type>
              <div class="rounded-[var(--radius-xl)] border border-border-soft bg-card p-8">
                <div class="h-6 w-40 rounded-full bg-muted" />
                <div
                  class={
                    props.moderationRoute
                      ? "mt-6 h-[75rem] rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70"
                      : "mt-6 h-48 rounded-[calc(var(--radius-xl)-0.5rem)] bg-muted/70"
                  }
                />
              </div>
            </div>
          ) : (
            <div class="grid min-w-0 place-items-center p-6">
              <div class="aspect-[9/16] h-[min(88dvh,50rem)] max-w-full rounded-[var(--radius-xl)] bg-gradient-to-b from-muted/50 to-muted" />
            </div>
          )}
          {props.dockOpen ? (
            <aside class="border-s border-border-soft bg-background p-6">
              <Type as="h2" variant="h3">Comments</Type>
              <div class="mt-6 space-y-4">
                <div class="h-16 rounded-xl bg-muted" />
                <div class="h-20 rounded-xl bg-muted" />
                <div class="h-16 rounded-xl bg-muted" />
              </div>
            </aside>
          ) : null}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const DesktopShell: Story = {
  render: () => <ShellChrome />,
};

export const MediaShellExpanded: Story = {
  name: "Media shell / Expanded",
  render: () => <MediaShellReview />,
};

export const UnifiedContentShell: Story = {
  name: "Unified shell / Content route",
  render: () => <MediaShellReview contentRoute populatedCommunities />,
};

export const UnifiedModerationShell: Story = {
  name: "Unified shell / Tall moderation route",
  render: () => <MediaShellReview contentRoute moderationRoute populatedCommunities />,
};

export const MediaShellCommunitiesOverflowing: Story = {
  name: "Media shell / Communities at the cap",
  render: () => <MediaShellReview overflowingCommunities populatedCommunities />,
};

export const MediaShellCollapsed: Story = {
  name: "Media shell / Collapsed icon rail",
  render: () => <MediaShellReview collapsed />,
};

export const MediaShellCommunities: Story = {
  name: "Media shell / Communities populated",
  render: () => <MediaShellReview populatedCommunities />,
};

export const MediaShellWithDock: Story = {
  name: "Media shell / Comments dock open",
  render: () => <MediaShellReview dockOpen populatedCommunities />,
};

export const DesktopShellRtl: Story = {
  globals: { direction: "rtl" },
  render: () => <ShellChrome isRtl />,
};

export const MobileShell: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <ShellChrome mobile />,
};

export const MobileShellRtl: Story = {
  globals: {
    direction: "rtl",
    viewport: { value: "mobile1", isRotated: false },
  },
  render: () => <ShellChrome mobile isRtl />,
};
