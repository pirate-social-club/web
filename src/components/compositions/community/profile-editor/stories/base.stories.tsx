import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CommunityProfileEditorPage } from "../community-profile-editor-page";

const avatarSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="80" fill="#0f766e" />
    <circle cx="80" cy="68" r="30" fill="#ccfbf1" />
    <path d="M34 144c7-34 24-51 46-51s39 17 46 51" fill="#ccfbf1" />
  </svg>
`)}`;

const bannerSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420">
    <rect width="1200" height="420" fill="#111827" />
    <path d="M0 320c160-80 320-98 480-54s300 72 458 20 246-95 262-104v238H0z" fill="#0f766e" />
    <circle cx="920" cy="100" r="120" fill="#14b8a6" opacity=".55" />
  </svg>
`)}`;

const meta = {
  title: "Compositions/Community/Moderation/ProfileEditor",
  component: CommunityProfileEditorPage,
  args: {
    avatarSrc,
    bannerSrc,
    description: "A community for collectors, builders, and curious people who care about durable digital spaces.",
    displayName: "Pirate Builders",
    onAvatarRemove: () => undefined,
    onAvatarSelect: () => undefined,
    onBannerRemove: () => undefined,
    onBannerSelect: () => undefined,
    onDescriptionChange: () => undefined,
    onDisplayNameChange: () => undefined,
    onSave: () => undefined,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityProfileEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyMedia: Story = {
  args: {
    avatarSrc: undefined,
    bannerSrc: undefined,
  },
};

export const WithValidationError: Story = {
  args: {
    displayName: "",
    displayNameError: "Community name is required.",
    saveDisabled: true,
  },
};

export const Saving: Story = {
  args: {
    saveLoading: true,
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [displayName, setDisplayName] = React.useState(args.displayName);
    const [description, setDescription] = React.useState(args.description);

    return (
      <CommunityProfileEditorPage
        {...args}
        description={description}
        displayName={displayName}
        onDescriptionChange={setDescription}
        onDisplayNameChange={setDisplayName}
      />
    );
  },
};
