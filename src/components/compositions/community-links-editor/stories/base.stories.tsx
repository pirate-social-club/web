import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import {
  CommunityLinksEditorPage,
  createEmptyCommunityLinkEditorItem,
  type CommunityLinkEditorItem,
} from "../community-links-editor-page";

function LinksEditorStory({
  initialLinks,
}: {
  initialLinks: CommunityLinkEditorItem[];
}) {
  const [links, setLinks] = React.useState(initialLinks);

  return (
    <CommunityLinksEditorPage
      links={links}
      onAddLink={() => setLinks((current) => [...current, createEmptyCommunityLinkEditorItem()])}
      onLinkChange={(id, patch) => setLinks((current) => current.map((link) => link.id === id ? { ...link, ...patch } : link))}
      onRemoveLink={(id) => setLinks((current) => current.filter((link) => link.id !== id))}
      onSave={() => undefined}
      saveDisabled={links.some((link) => !link.url.trim())}
    />
  );
}

const meta = {
  title: "Compositions/Moderation/Links",
  component: CommunityLinksEditorPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CommunityLinksEditorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    links: [
      {
        id: "link-1",
        label: "Spotify",
        platform: "spotify",
        url: "https://open.spotify.com/artist/example",
        verified: true,
      },
      {
        id: "link-2",
        label: "Official site",
        platform: "official_website",
        url: "https://example.com",
        verified: false,
      },
    ],
  },
  render: (args) => <LinksEditorStory initialLinks={args.links} />,
};

export const Blank: Story = {
  args: {
    links: [],
  },
  render: (args) => <LinksEditorStory initialLinks={args.links} />,
};
