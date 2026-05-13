import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/primitives/button";
import { IdentityHero } from "../identity-hero";

const avatarPlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="80" fill="#0ea5e9" />
    <circle cx="80" cy="70" r="32" fill="#e0f2fe" />
    <ellipse cx="80" cy="140" rx="56" ry="40" fill="#e0f2fe" />
  </svg>
`)}`;

const coverPlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400">
    <rect width="1200" height="400" fill="#0284c7" />
    <circle cx="200" cy="100" r="120" fill="#38bdf8" opacity="0.4" />
    <circle cx="900" cy="250" r="160" fill="#7dd3fc" opacity="0.3" />
  </svg>
`)}`;

const meta = {
  title: "Compositions/Profiles/IdentityHero",
  component: IdentityHero,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof IdentityHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    avatarFallback: "TM",
    avatarSrc: avatarPlaceholder,
    coverSrc: coverPlaceholder,
    title: "Tame Impala",
    subtitle: "c/tameimpala",
    details: <p className="text-base text-muted-foreground">92.1K followers · 48.2K citizens</p>,
    actions: (
      <div className="flex gap-3">
        <Button variant="secondary">Follow</Button>
        <Button>Join as citizen</Button>
      </div>
    ),
  },
};

export const WithoutImages: Story = {
  args: {
    avatarFallback: "TM",
    title: "Tame Impala",
    subtitle: "c/tameimpala",
    details: <p className="text-base text-muted-foreground">92.1K followers · 48.2K citizens</p>,
    actions: (
      <div className="flex gap-3">
        <Button variant="secondary">Follow</Button>
        <Button>Join as citizen</Button>
      </div>
    ),
  },
};

export const WithBadge: Story = {
  args: {
    avatarFallback: "TM",
    avatarSrc: avatarPlaceholder,
    coverSrc: coverPlaceholder,
    avatarBadgeCountryCode: "US",
    avatarBadgeLabel: "United States",
    title: "Tame Impala",
    subtitle: "c/tameimpala",
    actions: <Button variant="secondary">Edit profile</Button>,
  },
};

export const LongTitle: Story = {
  args: {
    avatarFallback: "TM",
    avatarSrc: avatarPlaceholder,
    coverSrc: coverPlaceholder,
    title: "This is an extremely long community name that should truncate gracefully",
    subtitle: "c/very-long-community-name-that-might-break-layout",
    actions: <Button variant="secondary">Follow</Button>,
  },
};
