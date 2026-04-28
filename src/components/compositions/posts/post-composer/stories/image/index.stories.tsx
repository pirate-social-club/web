import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator } from "../story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Image",
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
      mode="image"
      titleValue="Backstage at the show"
      titleCountLabel="21/300"
      textBodyValue=""
      captionValue="Caught this backstage right before the set."
    />
  ),
};
