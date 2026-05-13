import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../post-composer";
import type { ComposerAudienceState } from "../post-composer.types";
import { baseComposer, composerDecorator, composerParameters } from "./story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Composer",
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

export const AudiencePublic: Story = {
  name: "Audience / Public",
  render: function StoryRender() {
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

export const AudiencePublicDisabled: Story = {
  name: "Audience / Public Disabled",
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

export const ImageUpload: Story = {
  name: "Image / Upload",
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

export const LinkPasteUrl: Story = {
  name: "Link / Paste URL",
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

export const LiveStream: Story = {
  name: "Live / Stream",
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

export const LiveDuet: Story = {
  name: "Live / Duet",
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
