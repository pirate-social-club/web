/** @jsxImportSource @solidjs/web */

import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { PublicProfilePage } from "./public-profile-page";
import { publicProfileStoryProps } from "./story-fixtures";

const meta = {
  title: "App/Profiles/PublicProfilePage",
  component: PublicProfilePage,
  args: publicProfileStoryProps,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PublicProfilePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <PublicProfilePage {...publicProfileStoryProps} /> };

export const Songs: Story = {
  render: () => <PublicProfilePage {...publicProfileStoryProps} defaultTab="songs" />,
};

export const Videos: Story = {
  render: () => <PublicProfilePage {...publicProfileStoryProps} defaultTab="videos" />,
};

export const About: Story = {
  render: () => <PublicProfilePage {...publicProfileStoryProps} defaultTab="about" />,
};

export const Minimal: Story = {
  render: () => (
    <PublicProfilePage
      {...publicProfileStoryProps}
      avatarSrc={undefined}
      bannerSrc={undefined}
      bio={undefined}
      communities={undefined}
      displayName="new_user"
      handle="u/new_user.pirate"
      meta={undefined}
      posts={undefined}
      songs={undefined}
      videos={undefined}
    />
  ),
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  render: () => <PublicProfilePage {...publicProfileStoryProps} />,
};
