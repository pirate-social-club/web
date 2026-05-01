import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostComposer } from "../post-composer";
import { baseComposer, composerDecorator, composerParameters } from "./story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Legacy Tab Composer",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: "Overview",
  render: () => <PostComposer {...baseComposer} />,
};

export const DragAndDrop: Story = {
  name: "Drag and Drop",
  render: () => (
    <PostComposer
      {...baseComposer}
      titleValue="Try dragging a file here"
      textBodyValue="Drag an image, video, or audio file directly onto this composer."
    />
  ),
};
