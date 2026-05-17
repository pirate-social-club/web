import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../post-composer";
import type { ComposerAudienceState } from "../post-composer.types";
import { baseComposer, composerDecorator, composerParameters, InteractivePostComposer } from "./story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Composer",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

function makeLiveCoverUpload(name: string) {
  if (typeof File === "undefined") return null;
  return new File([
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <rect width="1600" height="900" fill="#101820"/>
      <rect x="0" y="0" width="1600" height="900" fill="#1b4d5c"/>
      <circle cx="1240" cy="260" r="260" fill="#ff3030" opacity=".86"/>
      <circle cx="420" cy="620" r="340" fill="#f8d64e" opacity=".78"/>
      <path d="M0 720 C280 540 430 760 720 585 C980 428 1120 502 1600 290 L1600 900 L0 900 Z" fill="#131313" opacity=".78"/>
      <rect x="120" y="112" width="1360" height="676" rx="36" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="18"/>
    </svg>`,
  ], name, { type: "image/svg+xml" });
}

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
  name: "Live / Go live now",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      mode="live"
      availableTabs={["text", "image", "video", "link", "song", "live"]}
      titleValue="Friday night set"
      titleCountLabel="16/300"
      textBodyValue="A Friday night live run through the new material."
      live={{
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        scheduleForLater: false,
        coverUpload: makeLiveCoverUpload("friday-night-set-cover.svg"),
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

export const LiveScheduledEvent: Story = {
  name: "Live / Scheduled event",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      mode="live"
      availableTabs={["text", "image", "video", "link", "song", "live"]}
      titleValue="Friday night set"
      titleCountLabel="16/300"
      textBodyValue="A Friday night live run through the new material."
      live={{
        roomKind: "solo",
        accessMode: "free",
        visibility: "public",
        scheduleForLater: true,
        scheduleAt: "2026-05-22T20:00",
        coverUpload: makeLiveCoverUpload("friday-night-set-cover.svg"),
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
    <InteractivePostComposer
      {...baseComposer}
      mode="live"
      availableTabs={["text", "image", "video", "link", "song", "live"]}
      titleValue="Late set with a guest"
      titleCountLabel="20/300"
      textBodyValue="A short late-night live set with a guest vocalist."
      monetization={{
        visible: true,
        priceUsd: "5",
        regionalPricingEnabled: false,
      }}
      live={{
        roomKind: "duet",
        accessMode: "paid",
        visibility: "public",
        scheduleForLater: true,
        scheduleAt: "2026-05-22T22:00",
        coverUpload: makeLiveCoverUpload("late-set-cover.svg"),
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

export const LivePaidPublishPreview: Story = {
  name: "Live / Paid Publish Preview",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="live"
      availableTabs={["text", "image", "video", "link", "song", "live"]}
      titleValue="Late set with a guest"
      titleCountLabel="20/300"
      textBodyValue="A short late-night live set with a guest vocalist."
      monetization={{
        visible: true,
        priceUsd: "5",
        regionalPricingEnabled: false,
      }}
      live={{
        roomKind: "duet",
        accessMode: "paid",
        visibility: "public",
        scheduleForLater: true,
        scheduleAt: "2026-05-22T22:00",
        coverUpload: makeLiveCoverUpload("late-set-cover.svg"),
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
