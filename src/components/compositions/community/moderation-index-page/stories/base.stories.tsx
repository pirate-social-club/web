import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { CurrencyDollar, IdentificationCard, Link, LockKey, NotePencil, Users } from "@phosphor-icons/react";

import type { CommunityModerationNavSection } from "@/components/compositions/community/moderation-shell/community-moderation-shell";
import { CommunityModerationIndexPage } from "../community-moderation-index-page";

const sections: CommunityModerationNavSection[] = [
  {
    label: "Community",
    items: [
      { label: "Profile", active: true, icon: IdentificationCard, onSelect: () => undefined },
      { label: "Rules", icon: NotePencil, onSelect: () => undefined },
      { label: "Links", icon: Link, onSelect: () => undefined },
    ],
  },
  {
    label: "Access",
    items: [
      { label: "Gates", icon: LockKey, onSelect: () => undefined },
      { label: "Pricing", icon: CurrencyDollar, onSelect: () => undefined },
      { label: "Members", icon: Users, onSelect: () => undefined },
    ],
  },
];

const meta = {
  title: "Compositions/Community/Moderation/IndexPage",
  component: CommunityModerationIndexPage,
  args: {
    sections,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityModerationIndexPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBackAction: Story = {
  args: {
    onBackClick: () => undefined,
  },
};

export const MobileLayout: Story = {
  args: {
    mobileLayout: true,
    onBackClick: () => undefined,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const Interactive: Story = {
  render: () => {
    const [active, setActive] = React.useState("Profile");

    return (
      <CommunityModerationIndexPage
        sections={sections.map((section) => ({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            active: item.label === active,
            onSelect: () => setActive(item.label),
          })),
        }))}
      />
    );
  },
};
