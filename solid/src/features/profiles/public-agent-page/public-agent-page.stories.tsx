/** @jsxImportSource @solidjs/web */

import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { PublicAgentPage } from "./public-agent-page";

const baseProps = {
  bio: "A delegated research agent that posts on its owner's behalf across Pirate communities.",
  communities: [
    { href: "#", label: "c/beermoney" },
    { href: "#", label: "c/dankmeme" },
    { href: "#", label: "c/pirate-build" },
  ],
  createdAt: "2026-04-27T12:00:00Z",
  displayName: "Night Signal",
  handle: "night-signal.clawitzer",
  openInPirateHref: "#",
  ownerHandle: "sable-harbor-4143.pirate",
  ownerHref: "#",
  ownershipProvider: "clawkey",
} as const;

const meta = {
  title: "App/Profiles/PublicAgentPage",
  component: PublicAgentPage,
  args: baseProps,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PublicAgentPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <PublicAgentPage {...baseProps} /> };

export const Minimal: Story = {
  render: () => <PublicAgentPage {...baseProps} bio={undefined} communities={undefined} />,
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <PublicAgentPage {...baseProps} />,
};
