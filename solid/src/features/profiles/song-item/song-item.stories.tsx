/** @jsxImportSource @solidjs/web */

import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { IconPlay, MediaControlButton } from "../../../design-system";
import { fixtureImage } from "../../posts/post-card/fixtures";
import { SongItem } from "./song-item";

const meta = {
  title: "App/Profiles/SongItem",
  component: SongItem,
  args: { artworkSrc: fixtureImage("cancion-animal", 240, 240), artistName: "Soda Stereo", title: "Cancion Animal" },
  decorators: [(Story) => <div class="w-full max-w-xl"><Story /></div>],
} satisfies Meta<typeof SongItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SongItem artistName="Soda Stereo" artworkSrc={fixtureImage("cancion-animal", 240, 240)} title="Cancion Animal" />,
};

export const WithMeta: Story = {
  render: () => (
    <SongItem
      artistName="Soda Stereo"
      artworkSrc={fixtureImage("cancion-animal", 240, 240)}
      metaItems={[{ label: "Scrobbled 6m ago" }, { href: "#", label: "c/argentina" }, { label: "418 plays" }]}
      title="Cancion Animal"
    />
  ),
};

export const WithoutArtist: Story = {
  render: () => <SongItem metaItems={[{ label: "Local file" }]} title="Untitled Demo" />,
};

export const WithAction: Story = {
  render: () => (
    <SongItem
      artistName="Soda Stereo"
      artworkSrc={fixtureImage("cancion-animal", 240, 240)}
      metaItems={[{ label: "Now playing" }]}
      title="Cancion Animal"
      trailingContent={(
        <MediaControlButton aria-label="Play" onClick={() => undefined} size="md">
          <IconPlay class="size-5" />
        </MediaControlButton>
      )}
    />
  ),
};
