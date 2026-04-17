import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunitySidebar } from "../community-sidebar";
import type { CommunitySidebarProps, CommunitySidebarRule } from "../community-sidebar.types";

const fullCommunity: CommunitySidebarProps = {
  displayName: "Tame Impala",
  description:
    "Everything about Tame Impala — albums, deep cuts, live sessions, and production talk.",
  memberCount: 48231,
  createdAt: "2024-06-15T00:00:00Z",
  membershipMode: "open",
  moderator: {
    avatarSrc: "https://i.pravatar.cc/96?img=12",
    displayName: "Kevin Parker",
    handle: "u/kevinparker.pirate",
  },
  charity: {
    avatarSrc: "https://placehold.co/96x96/18181b/f5f5f5?text=M",
    href: "https://www.musicares.org",
    name: "MusiCares",
  },
  rules: [
    {
      ruleId: "r1",
      title: "No low-effort posts",
      body: "Memes and one-liners belong in the weekly discussion thread.",
      position: 0,
      status: "active",
    },
    {
      ruleId: "r2",
      title: "Flair your posts",
      body: "Use the appropriate flair when posting.",
      position: 1,
      status: "active",
    },
    {
      ruleId: "r3",
      title: "Be respectful",
      body: "Personal attacks and gatekeeping will result in a ban.",
      position: 2,
      status: "active",
    },
  ],
  referenceLinks: [
    {
      communityReferenceLinkId: "rl1",
      platform: "spotify",
      url: "https://open.spotify.com/artist/5INjqkS1d8Yy7I3GdE8c5J",
      label: null,
      linkStatus: "active",
      verified: true,
      metadata: { displayName: "Spotify", imageUrl: null },
      position: 0,
    },
    {
      communityReferenceLinkId: "rl2",
      platform: "youtube",
      url: "https://youtube.com/@tameimpala",
      label: null,
      linkStatus: "active",
      verified: true,
      metadata: { displayName: "YouTube", imageUrl: null },
      position: 1,
    },
    {
      communityReferenceLinkId: "rl3",
      platform: "instagram",
      url: "https://instagram.com/tameimpala",
      label: null,
      linkStatus: "active",
      verified: false,
      metadata: { displayName: null, imageUrl: null },
      position: 2,
    },
    {
      communityReferenceLinkId: "rl4",
      platform: "official_website",
      url: "https://tameimpala.com",
      label: null,
      linkStatus: "active",
      verified: true,
      metadata: { displayName: null, imageUrl: null },
      position: 3,
    },
  ],
  flairPolicy: {
    flairEnabled: true,
    definitions: [
      {
        flairId: "f1",
        label: "Discussion",
        colorToken: "#6377f0",
        status: "active",
        position: 0,
      },
      {
        flairId: "f2",
        label: "News",
        colorToken: "#f06377",
        status: "active",
        position: 1,
      },
      {
        flairId: "f3",
        label: "Media",
        colorToken: "#63f0a5",
        status: "active",
        position: 2,
      },
      {
        flairId: "f4",
        label: "Original",
        colorToken: "#f0d163",
        status: "active",
        position: 3,
      },
    ],
  },
};

const manyRulesCommunity: CommunitySidebarProps = {
  ...fullCommunity,
  rules: [
    {
      ruleId: "r1",
      title: "No low-effort posts",
      body: "Memes and one-liners belong in the weekly discussion thread.",
      position: 0,
      status: "active",
    },
    {
      ruleId: "r2",
      title: "Flair your posts",
      body: "Use the appropriate flair when posting. If unsure, a mod will set it for you.",
      position: 1,
      status: "active",
    },
    {
      ruleId: "r3",
      title: "Be respectful",
      body: "Personal attacks and gatekeeping will result in a ban.",
      position: 2,
      status: "active",
    },
    {
      ruleId: "r4",
      title: "No self-promotion spam",
      body: "Original music goes in the weekly share thread only.",
      position: 3,
      status: "active",
    },
    {
      ruleId: "r5",
      title: "Use the search bar",
      body: "Common questions have been answered many times.",
      position: 4,
      status: "active",
    },
    {
      ruleId: "r6",
      title: "Mark spoilers",
      body: "Spoilers for unreleased music must be marked in the title.",
      position: 5,
      status: "active",
    },
    {
      ruleId: "r7",
      title: "No reposts within 30 days",
      body: "Check before posting — duplicate threads will be removed.",
      position: 6,
      status: "active",
    },
    {
      ruleId: "r8",
      title: "Credit original creators",
      body: "Always credit the original artist when sharing covers or remixes.",
      position: 7,
      status: "active",
    },
  ],
};

const gatedCommunity: CommunitySidebarProps = {
  displayName: "Producers Only",
  description:
    "A gated space for working producers to share techniques, stems, and feedback. Identity verification required to join.",
  memberCount: 1284,
  createdAt: "2025-01-20T00:00:00Z",
  membershipMode: "gated",
  moderator: {
    avatarSrc: "https://i.pravatar.cc/96?img=33",
    displayName: "modmatrix",
    handle: "u/modmatrix.pirate",
  },
  rules: [
    {
      ruleId: "r1",
      title: "Verified producers only",
      body: "You must complete identity verification before posting.",
      position: 0,
      status: "active",
    },
    {
      ruleId: "r2",
      title: "No leaked stems",
      body: "Only share stems you have the rights to distribute.",
      position: 1,
      status: "active",
    },
  ],
  referenceLinks: [
    {
      communityReferenceLinkId: "rl1",
      platform: "discord",
      url: "https://discord.gg/example",
      label: "Discord",
      linkStatus: "active",
      verified: true,
      metadata: { displayName: null, imageUrl: null },
      position: 0,
    },
  ],
  flairPolicy: {
    flairEnabled: true,
    definitions: [
      {
        flairId: "f1",
        label: "Feedback",
        colorToken: "#f0a040",
        status: "active",
        position: 0,
      },
      {
        flairId: "f2",
        label: "Stems",
        colorToken: "#40a0f0",
        status: "active",
        position: 1,
      },
      {
        flairId: "f3",
        label: "Tutorial",
        colorToken: "#a040f0",
        status: "active",
        position: 2,
      },
    ],
  },
};

const minimalCommunity: CommunitySidebarProps = {
  displayName: "New Community",
  memberCount: 3,
  createdAt: "2026-04-09T00:00:00Z",
  membershipMode: "open",
  moderator: {
    displayName: "founder",
    handle: "u/founder.pirate",
  },
};

const manyFlairsCommunity: CommunitySidebarProps = {
  ...fullCommunity,
  flairPolicy: {
    flairEnabled: true,
    definitions: [
      { flairId: "f1", label: "Discussion", colorToken: "#6377f0", status: "active", position: 0 },
      { flairId: "f2", label: "News", colorToken: "#f06377", status: "active", position: 1 },
      { flairId: "f3", label: "Media", colorToken: "#63f0a5", status: "active", position: 2 },
      { flairId: "f4", label: "Original", colorToken: "#f0d163", status: "active", position: 3 },
      { flairId: "f5", label: "Question", colorToken: "#d163f0", status: "active", position: 4 },
      { flairId: "f6", label: "Meme", colorToken: "#63f0d1", status: "active", position: 5 },
      { flairId: "f7", label: "Live", colorToken: "#f06337", status: "active", position: 6 },
      { flairId: "f8", label: "Remix", colorToken: "#37f063", status: "active", position: 7 },
    ],
  },
};

const noFlairsCommunity: CommunitySidebarProps = {
  ...fullCommunity,
  flairPolicy: null,
};

const namespaceReadyCommunity: CommunitySidebarProps = {
  ...minimalCommunity,
  namespacePanel: {
    routeLabel: "c/cmt_7ad4fad6214240c486fb320c0b8c247e",
    status: "available",
    onOpen: () => {},
  },
};

const namespacePendingCommunity: CommunitySidebarProps = {
  ...minimalCommunity,
  namespacePanel: {
    routeLabel: "c/cmt_7ad4fad6214240c486fb320c0b8c247e",
    status: "pending",
    onOpen: () => {},
  },
};

const namespaceVerifiedCommunity: CommunitySidebarProps = {
  ...minimalCommunity,
  namespacePanel: {
    routeLabel: "c/argentina",
    status: "verified",
  },
};

const meta = {
  title: "Compositions/CommunitySidebar",
  component: CommunitySidebar,
  args: fullCommunity,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex gap-6 px-6 py-8">
          <div className="min-w-0 flex-1 space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                className="rounded-lg bg-muted/30"
                key={i}
                style={{ height: `${100 + (i % 3) * 30}px` }}
              />
            ))}
          </div>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof CommunitySidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Full: Story = {
  name: "Full sidebar",
  render: () => <CommunitySidebar {...fullCommunity} />,
};

export const Gated: Story = {
  name: "Gated community",
  render: () => <CommunitySidebar {...gatedCommunity} />,
};

export const Minimal: Story = {
  name: "Minimal (identity only)",
  render: () => <CommunitySidebar {...minimalCommunity} />,
};

export const ManyRules: Story = {
  name: "Many rules (collapse)",
  render: () => <CommunitySidebar {...manyRulesCommunity} />,
};

export const ManyFlairs: Story = {
  name: "Many tags (truncated)",
  render: () => <CommunitySidebar {...manyFlairsCommunity} />,
};

export const NoFlairs: Story = {
  name: "No tags",
  render: () => <CommunitySidebar {...noFlairsCommunity} />,
};

export const NamespaceReady: Story = {
  name: "Namespace ready",
  render: () => <CommunitySidebar {...namespaceReadyCommunity} />,
};

export const NamespacePending: Story = {
  name: "Namespace pending",
  render: () => <CommunitySidebar {...namespacePendingCommunity} />,
};

export const NamespaceVerified: Story = {
  name: "Namespace verified",
  render: () => <CommunitySidebar {...namespaceVerifiedCommunity} />,
};

export const CommerceDonationOff: Story = {
  name: "Donation off",
  render: () => (
    <CommunitySidebar
      {...fullCommunity}
      charity={null}
    />
  ),
};

export const NoDescription: Story = {
  name: "No description",
  render: () => (
    <CommunitySidebar
      {...fullCommunity}
      description={null}
      referenceLinks={undefined}
      flairPolicy={null}
    />
  ),
};

export const Mobile: Story = {
  name: "Mobile layout",
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="space-y-4 px-4 py-8">
      <CommunitySidebar {...fullCommunity} />
    </div>
  ),
};
