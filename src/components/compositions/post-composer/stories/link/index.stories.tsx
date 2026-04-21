import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator } from "../story-helpers";

const meta = {
  title: "Compositions/PostComposer/Link",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PasteUrl: Story = {
  name: "Default",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="link"
      captionValue="Worth posting for the production notes alone."
      linkUrlValue="https://032c.com/magazine/kanye-west-tour-design"
      linkPreview={{
        title: "Inside the Visual Language of the Yeezus Tour",
        domain: "032c.com",
        description:
          "A look at staging, projection, and performance design choices that shaped the live show.",
        imageSrc: "https://picsum.photos/seed/yeezus-link/320/180",
      }}
    />
  ),
};
