import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator } from "../story-helpers";

const meta = {
  title: "Compositions/PostComposer/Live",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LiveStream: Story = {
  name: "Default",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="live"
      availableTabs={["text", "image", "video", "link", "song", "live"]}
      titleValue="Friday night set"
      titleCountLabel="16/300"
      live={{
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        coverLabel: "friday-night-set-cover.png",
        trackOptions: [
          { id: "trk_01midnightwaves", title: "Midnight Waves", subtitle: "DJ Solar" },
          { id: "trk_01echoes", title: "Echoes", subtitle: "DJ Solar" },
          { id: "trk_01afterhours", title: "After Hours", subtitle: "DJ Solar" },
          { id: "trk_01blue", title: "Blue", subtitle: "Joni Mitchell" },
        ],
        setlistItems: [
          {
            declaredTrackId: "trk_01midnightwaves",
            titleText: "Midnight Waves",
            artistText: "DJ Solar",
            performanceKind: "original",
          },
          {
            declaredTrackId: "trk_01echoes",
            titleText: "Echoes",
            artistText: "DJ Solar",
            performanceKind: "original",
          },
          {
            titleText: "Blue",
            artistText: "Joni Mitchell",
            performanceKind: "cover",
          },
        ],
        setlistStatus: "draft",
        performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
      }}
    />
  ),
};

export const Duet: Story = {
  name: "Duet",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="live"
      availableTabs={["text", "image", "video", "link", "song", "live"]}
      titleValue="Late set with a guest"
      titleCountLabel="20/300"
      live={{
        roomKind: "duet",
        accessMode: "paid",
        visibility: "public",
        coverLabel: "late-set-cover.png",
        guestUserId: "u/guest-vocal",
        trackOptions: [
          { id: "trk_01afterhours", title: "After Hours", subtitle: "DJ Solar" },
          { id: "trk_01midnightwaves", title: "Midnight Waves", subtitle: "DJ Solar" },
          { id: "trk_01blue", title: "Blue", subtitle: "Joni Mitchell" },
        ],
        setlistItems: [
          {
            declaredTrackId: "trk_01afterhours",
            titleText: "After Hours",
            artistText: "DJ Solar",
            performanceKind: "original",
          },
        ],
        setlistStatus: "draft",
        performerAllocations: [
          { userId: "u/host", role: "host", sharePct: 60 },
          { userId: "u/guest-vocal", role: "guest", sharePct: 40 },
        ],
      }}
    />
  ),
};
