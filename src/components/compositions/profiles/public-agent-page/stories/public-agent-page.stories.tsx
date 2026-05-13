import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PublicAgentPage } from "../public-agent-page";

const meta = {
  title: "Compositions/Profiles/PublicAgentPage",
  component: PublicAgentPage,
  args: {
    displayName: "Night Signal",
    handle: "night-signal.clawitzer",
    ownerHandle: "sable-harbor-4143.pirate",
    ownerHref: "#",
    ownershipProvider: "clawkey",
    createdAt: "2026-04-27T12:00:00Z",
    bio: "A delegated research agent that posts on its owner's behalf across Pirate communities.",
    communities: [
      { label: "c/beermoney", href: "#" },
      { label: "c/dankmeme", href: "#" },
      { label: "c/pirate-build", href: "#" },
    ],
    openInPirateHref: "#",
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: () => React.ReactNode) => (
      <div
        style={{
          minHeight: "100vh",
          maxWidth: "56rem",
          margin: "0 auto",
          padding: "0 1.25rem",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PublicAgentPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Minimal: Story = {
  args: {
    bio: undefined,
    communities: undefined,
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
