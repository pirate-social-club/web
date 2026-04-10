import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator } from "../story-helpers";

const meta = {
  title: "Compositions/PostComposer/Video",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Upload: Story = {
  name: "Default",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="video"
      titleValue="Fan edit from the encore"
      titleCountLabel="24/300"
      captionValue="Posting the cut now. Attribution can stay tucked away unless needed."
    />
  ),
};

export const Reference: Story = {
  name: "With Reference Required",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="video"
      titleValue="Fan edit from the encore"
      titleCountLabel="24/300"
      captionValue="Posting the cut now. Attribution can stay tucked away unless needed."
      derivativeStep={{
        visible: true,
        required: true,
        trigger: "analysis",
        query: "encore live original",
        references: [
          {
            id: "ast_02def",
            title: "Encore performance",
            subtitle: "Likely matched source video",
          },
        ],
        requirementLabel: "Attach the source video before posting.",
      }}
    />
  ),
};
