import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CaretDown, Plus } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { CommunityPageShell } from "../community-page-shell";
import type { CommunitySidebarProps } from "@/components/compositions/community-sidebar/community-sidebar.types";
import {
  sortOptions,
  tameImpalaFeedItems,
} from "@/components/compositions/feed/stories/story-fixtures";

const infinityAvatarPlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="Infinity avatar">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fb923c" />
        <stop offset="100%" stop-color="#ea580c" />
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#bg)" />
    <path d="M36 82c0-18 11-31 28-31 16 0 27 11 41 30 11 15 18 22 27 22 10 0 16-7 16-18 0-11-8-19-21-19-8 0-15 2-23 8l-10-12c10-8 21-12 35-12 22 0 36 13 36 34 0 21-13 35-31 35-16 0-27-11-41-30-11-15-18-22-28-22-9 0-15 7-15 17 0 11 8 19 20 19 8 0 16-2 25-9l9 12c-11 8-22 13-35 13-21 0-33-13-33-37z" fill="#fff7ed" />
  </svg>
`)}`;

const infinityBannerPlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 320" role="img" aria-label="Infinity banner">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#292524" />
        <stop offset="50%" stop-color="#7c2d12" />
        <stop offset="100%" stop-color="#1c1917" />
      </linearGradient>
      <radialGradient id="glow" cx="30%" cy="18%" r="50%">
        <stop offset="0%" stop-color="rgba(251,146,60,0.45)" />
        <stop offset="100%" stop-color="rgba(251,146,60,0)" />
      </radialGradient>
    </defs>
    <rect width="1600" height="320" fill="url(#bg)" />
    <circle cx="280" cy="72" r="210" fill="url(#glow)" />
    <circle cx="1260" cy="40" r="120" fill="rgba(255,255,255,0.08)" />
    <path d="M0 238C160 190 314 168 480 174C684 181 846 244 1068 244C1278 244 1420 190 1600 126V320H0Z" fill="rgba(255,247,237,0.12)" />
    <path d="M0 270C210 210 396 214 566 232C754 252 928 288 1116 280C1296 272 1452 224 1600 182V320H0Z" fill="rgba(0,0,0,0.16)" />
    <text x="72" y="92" fill="rgba(255,247,237,0.9)" font-family="ui-sans-serif, system-ui" font-size="40" font-weight="700" letter-spacing="6">INFINITY</text>
  </svg>
`)}`;

const tameImpalaAvatarPlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="Tame Impala avatar">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#14b8a6" />
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#bg)" />
    <circle cx="80" cy="80" r="48" fill="rgba(15,23,42,0.18)" />
    <path d="M44 96c10-28 23-44 40-44 16 0 28 12 40 37-8-6-18-9-28-9-20 0-34 8-52 16z" fill="#ecfeff" />
    <path d="M44 102c20-12 35-18 51-18 12 0 21 3 29 9-14 14-26 21-39 21-16 0-28-4-41-12z" fill="#082f49" />
  </svg>
`)}`;

const tameImpalaBannerPlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 320" role="img" aria-label="Tame Impala banner">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#172554" />
        <stop offset="42%" stop-color="#0f766e" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>
    </defs>
    <rect width="1600" height="320" fill="url(#bg)" />
    <ellipse cx="420" cy="180" rx="300" ry="100" fill="rgba(255,255,255,0.08)" />
    <ellipse cx="920" cy="110" rx="420" ry="120" fill="rgba(251,191,36,0.12)" />
    <ellipse cx="1260" cy="246" rx="360" ry="88" fill="rgba(255,255,255,0.06)" />
    <text x="72" y="92" fill="rgba(240,253,250,0.9)" font-family="ui-sans-serif, system-ui" font-size="36" font-weight="700" letter-spacing="5">TAME IMPALA</text>
  </svg>
`)}`;

const infinitySidebar: CommunitySidebarProps = {
  avatarSrc: infinityAvatarPlaceholder,
  createdAt: "2026-04-17T00:00:00Z",
  description: "To infinity and beyond",
  displayName: "Infinity",
  membershipMode: "open",
  memberCount: null,
};

const tameImpalaSidebar: CommunitySidebarProps = {
  avatarSrc: tameImpalaAvatarPlaceholder,
  createdAt: "2024-06-15T00:00:00Z",
  description:
    "Everything about Tame Impala — albums, deep cuts, live sessions, and production talk.",
  displayName: "Tame Impala",
  membershipMode: "open",
  memberCount: 48231,
  referenceLinks: [
    {
      communityReferenceLinkId: "spotify",
      platform: "spotify",
      url: "https://open.spotify.com/artist/5INjqkS1d8Yy7I3GdE8c5J",
      label: null,
      linkStatus: "active",
      metadata: { displayName: "Spotify", imageUrl: null },
      position: 0,
      verified: true,
    },
  ],
  rules: [
    {
      body: "Memes and one-liners belong in the weekly discussion thread.",
      position: 0,
      ruleId: "rule-1",
      status: "active",
      title: "No low-effort posts",
    },
    {
      body: "Use the appropriate flair when posting.",
      position: 1,
      ruleId: "rule-2",
      status: "active",
      title: "Flair your posts",
    },
  ],
};

function formatCompactCount(value: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function CommunityStats({
  citizen,
  citizens,
  followers,
  following,
}: {
  citizen?: boolean;
  citizens: number;
  followers: number;
  following?: boolean;
}) {
  const items = [
    `${formatCompactCount(followers)} Followers`,
    `${formatCompactCount(citizens)} Citizens`,
    following ? "Following" : null,
    citizen ? "Citizen" : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted-foreground">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function CommunityRelationshipAction({
  canJoin = true,
  citizen,
  following,
  onCitizenChange,
  onFollowingChange,
}: {
  canJoin?: boolean;
  citizen: boolean;
  following: boolean;
  onCitizenChange: (value: boolean) => void;
  onFollowingChange: (value: boolean) => void;
}) {
  const primaryLabel = citizen ? "Create Post" : following ? "Following" : "Follow";
  const primaryVariant = citizen || !following ? "default" : "secondary";
  const joinDisabled = !canJoin || citizen;

  const joinAsCitizen = React.useCallback(() => {
    if (!canJoin) return;
    onCitizenChange(true);
    onFollowingChange(true);
  }, [canJoin, onCitizenChange, onFollowingChange]);

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
      <Button
        onClick={() => {
          if (citizen) return;
          onFollowingChange(!following);
        }}
        variant={primaryVariant}
      >
        {primaryLabel}
      </Button>
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            aria-label="Community relationship actions"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm transition-[background-color,box-shadow,color] hover:bg-secondary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            type="button"
          >
            <CaretDown className="size-5" />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="end"
            className="relative z-50 min-w-[13rem] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-popover p-0 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[side=bottom]:translate-y-1"
            sideOffset={6}
          >
            {canJoin || citizen ? (
              <DropdownMenuItem
                disabled={joinDisabled}
                onSelect={joinAsCitizen}
              >
                {citizen ? "Citizen" : "Join as citizen"}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                Cannot become citizen
              </DropdownMenuItem>
            )}
            {citizen || following ? (
              <>
                <DropdownMenuPrimitive.Separator className="h-px bg-border" />
                <DropdownMenuItem
                  onSelect={() => onFollowingChange(!following)}
                >
                  {following ? "Unfollow home feed" : "Follow"}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}

function DropdownMenuItem({
  children,
  className,
  disabled,
  onSelect,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative w-full cursor-pointer select-none px-3 py-2.5 text-start text-base text-popover-foreground outline-none transition-colors focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      disabled={disabled}
      onSelect={onSelect}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

const meta = {
  title: "Compositions/CommunityPageShell",
  component: CommunityPageShell,
  args: {
    communityId: "cmt_story",
    items: [],
    sidebar: infinitySidebar,
    title: "Community",
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div style={{ padding: 16 }}>
        <div style={{ margin: "0 auto", width: "min(100%, 1200px)" }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof CommunityPageShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyCommunity: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("new");

    return (
      <CommunityPageShell
        activeSort={activeSort}
        availableSorts={sortOptions}
        avatarSrc={infinityAvatarPlaceholder}
        bannerSrc={infinityBannerPlaceholder}
        communityId="cmt_infinity"
        headerAction={<Button leadingIcon={<Plus className="size-5" />}>Create Post</Button>}
        heroDetails={<CommunityStats citizen citizens={1270} followers={18400} following />}
        items={[]}
        onSortChange={setActiveSort}
        routeLabel="c/infinity"
        sidebar={infinitySidebar}
        title="Infinity"
      />
    );
  },
};

export const CommunityWithPosts: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");

    return (
      <CommunityPageShell
        activeSort={activeSort}
        availableSorts={sortOptions}
        avatarSrc={tameImpalaAvatarPlaceholder}
        bannerSrc={tameImpalaBannerPlaceholder}
        communityId="cmt_tame_impala"
        headerAction={<Button leadingIcon={<Plus className="size-5" />}>Create Post</Button>}
        heroDetails={<CommunityStats citizen citizens={48231} followers={92100} following />}
        items={tameImpalaFeedItems}
        onSortChange={setActiveSort}
        routeLabel="c/tameimpala"
        routeVerified
        sidebar={tameImpalaSidebar}
        title="Tame Impala"
      />
    );
  },
};

export const FollowingNotCitizen: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("best");
    const [following, setFollowing] = React.useState(true);
    const [citizen, setCitizen] = React.useState(false);

    return (
      <CommunityPageShell
        activeSort={activeSort}
        availableSorts={sortOptions}
        avatarSrc={tameImpalaAvatarPlaceholder}
        bannerSrc={tameImpalaBannerPlaceholder}
        communityId="cmt_tame_impala"
        headerAction={(
          <CommunityRelationshipAction
            citizen={citizen}
            following={following}
            onCitizenChange={setCitizen}
            onFollowingChange={setFollowing}
          />
        )}
        heroDetails={<CommunityStats citizen={citizen} citizens={48231} followers={92100} following={following} />}
        items={tameImpalaFeedItems}
        onSortChange={setActiveSort}
        routeLabel="c/tameimpala"
        routeVerified
        sidebar={tameImpalaSidebar}
        title="Tame Impala"
      />
    );
  },
};

export const CanFollowCannotJoin: Story = {
  args: {},
  render: () => {
    const [activeSort, setActiveSort] = React.useState<"best" | "new" | "top">("new");
    const [following, setFollowing] = React.useState(false);
    const [citizen, setCitizen] = React.useState(false);

    return (
      <CommunityPageShell
        activeSort={activeSort}
        availableSorts={sortOptions}
        avatarSrc={infinityAvatarPlaceholder}
        bannerSrc={infinityBannerPlaceholder}
        communityId="cmt_infinity"
        headerAction={(
          <CommunityRelationshipAction
            canJoin={false}
            citizen={citizen}
            following={following}
            onCitizenChange={setCitizen}
            onFollowingChange={setFollowing}
          />
        )}
        heroDetails={<CommunityStats citizen={citizen} citizens={1270} followers={18400} following={following} />}
        items={[]}
        onSortChange={setActiveSort}
        routeLabel="c/infinity"
        sidebar={infinitySidebar}
        title="Infinity"
      />
    );
  },
};
