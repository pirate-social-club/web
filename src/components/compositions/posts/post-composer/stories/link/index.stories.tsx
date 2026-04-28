import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters } from "../story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Link",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PasteUrl: Story = {
  name: "Default",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="link"
      linkUrlValue="https://032c.com/magazine/kanye-west-tour-design"
      textBodyValue="Worth posting for the production notes alone."
      titleValue="A sharp look at tour design"
    />
  ),
};
