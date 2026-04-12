import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import {
  baseComposer,
  ComposerWithSubmitPreview,
  composerDecorator,
} from "../story-helpers";

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
    <ComposerWithSubmitPreview
      {...baseComposer}
      mode="link"
      titleValue="Interview on the design of Yeezus era staging"
      titleCountLabel="46/300"
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

export const SubmitPayload: Story = {
  name: "Submit Payload",
  render: () => (
    <ComposerWithSubmitPreview
      {...baseComposer}
      mode="link"
      titleValue="Worth reading for the feed-ranking notes"
      titleCountLabel="40/300"
      captionValue="Posting this with markdown commentary and a clean link preview."
      linkUrlValue="https://pirate.sc/blog/feed-ranking"
      linkPreview={{
        title: "How We Think About Ranking Music Communities",
        domain: "pirate.sc",
        description:
          "A breakdown of recency, trust, and cold start tradeoffs in the Pirate feed.",
        imageSrc: "https://picsum.photos/seed/pirate-feed-ranking/320/180",
      }}
    />
  ),
};
