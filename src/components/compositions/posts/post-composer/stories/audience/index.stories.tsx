import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import type { ComposerAudienceState } from "../../post-composer.types";
import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters } from "../story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Legacy Tab Composer/Audience",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommunityDefault: Story = {
  name: "Default",
  render: () => <PostComposer {...baseComposer} />,
};

export const Public: Story = {
  name: "Public",
  render: () => {
    const [audience, setAudience] = React.useState<ComposerAudienceState>({
      visibility: "public",
      publicOptionEnabled: true,
    });
    return (
      <PostComposer
        {...baseComposer}
        audience={audience}
        onAudienceChange={setAudience}
      />
    );
  },
};

export const PublicDisabled: Story = {
  name: "Public Disabled",
  render: () => (
    <PostComposer
      {...baseComposer}
      clubName="c/us-politics"
      audience={{
        visibility: "members_only",
        publicOptionEnabled: false,
        publicOptionDisabledReason: "This community already limits who can read posts.",
      }}
    />
  ),
};
