import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { PostComposer } from "./post-composer";
import { baseComposer, communityItems } from "./story-fixtures";
import { ComposerFrame, InteractiveComposer } from "./story-helpers";

const meta = {
  title: "App/Posts/PostComposer/Composer",
  component: PostComposer,
  args: baseComposer,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The post composer port. Host-owned identity, community selection, upload, and submit callbacks are represented with deterministic Storybook fixtures.",
      },
    },
  },
} satisfies Meta<typeof PostComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: "Overview",
  render: () => (
    <ComposerFrame>
      <PostComposer {...baseComposer} />
    </ComposerFrame>
  ),
};
export const DragAndDrop: Story = {
  name: "Drag and drop",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        titleValue="Try dragging a file here"
        textBodyValue="Drop an image, video, audio file, or downloadable document onto the composer."
      />
    </ComposerFrame>
  ),
};

export const CommunityPicker: Story = {
  name: "Community picker",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        communityPickerItems={communityItems}
        onSelectCommunity={() => undefined}
      />
    </ComposerFrame>
  ),
};

export const PublicAudience: Story = {
  name: "Audience / Public",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        audience={{ visibility: "public", publicOptionEnabled: true }}
        composerStep="settings"
      />
    </ComposerFrame>
  ),
};

export const MembersOnly: Story = {
  name: "Audience / Members only",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        audience={{
          visibility: "members_only",
          publicOptionEnabled: false,
          publicOptionDisabledReason: "This community limits posts to members.",
        }}
        composerStep="settings"
      />
    </ComposerFrame>
  ),
};

export const ImageUpload: Story = {
  name: "Image / Upload",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="image"
        imageUploadLabel="backstage-at-the-show.jpg"
        titleValue="Backstage at the show"
        captionValue="Caught this backstage right before the set."
      />
    </ComposerFrame>
  ),
};

export const LinkPaste: Story = {
  name: "Link / Paste URL",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="link"
        titleValue="A sharp look at tour design"
        linkUrlValue="https://032c.com/magazine/kanye-west-tour-design"
        textBodyValue="Worth posting for the production notes alone."
        linkPreview={{
          domain: "032c.com",
          title: "A sharp look at tour design",
          description: "Production notes from a long-running tour.",
          state: "preview",
        }}
      />
    </ComposerFrame>
  ),
};

export const LiveStream: Story = {
  name: "Live / Go live now",
  render: () => (
    <ComposerFrame>
      <InteractiveComposer
        {...baseComposer}
        mode="live"
        availableTabs={["text", "image", "video", "link", "song", "live"]}
        titleValue="Friday night set"
        textBodyValue="A live run through the new material with a short Q&A."
        live={{
          roomKind: "solo",
          accessMode: "free",
          visibility: "public",
          scheduleForLater: false,
          setlistItems: [],
          setlistStatus: "draft",
          performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
        }}
      />
    </ComposerFrame>
  ),
};

export const LiveScheduledEvent: Story = {
  name: "Live / Scheduled event",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="live"
        composerStep="write"
        titleValue="Friday night set"
        live={{
          roomKind: "solo",
          accessMode: "free",
          visibility: "public",
          scheduleForLater: true,
          scheduleAt: "2026-08-22T20:00",
          setlistItems: [],
          setlistStatus: "draft",
          performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
        }}
      />
    </ComposerFrame>
  ),
};

export const LiveDuet: Story = {
  name: "Live / Duet",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="live"
        titleValue="Late set with a guest"
        live={{
          roomKind: "duet",
          accessMode: "free",
          visibility: "public",
          guestUserId: "usr_guest",
          setlistItems: [],
          setlistStatus: "draft",
          performerAllocations: [
            { userId: "", role: "host", sharePct: 70 },
            { userId: "usr_guest", role: "guest", sharePct: 30 },
          ],
        }}
      />
    </ComposerFrame>
  ),
};

export const LivePaidDuetRoyaltySplit: Story = {
  name: "Live / Paid duet and royalty split",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="live"
        titleValue="Ticketed duet session"
        live={{
          roomKind: "duet",
          accessMode: "paid",
          visibility: "public",
          guestUserId: "usr_guest",
          setlistItems: [],
          setlistStatus: "draft",
          performerAllocations: [
            { userId: "", role: "host", sharePct: 60 },
            { userId: "usr_guest", role: "guest", sharePct: 40 },
          ],
        }}
        monetization={{ visible: true, priceUsd: "12.00" }}
        royaltySplit={{
          allocations: [
            { id: "creator", recipientKind: "creator", sharePct: 60 },
            { id: "guest", recipientKind: "collaborator", sharePct: 40 },
          ],
        }}
      />
    </ComposerFrame>
  ),
};

export const LivePaidPublishPreview: Story = {
  name: "Live / Paid publish preview",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="live"
        composerStep="publish"
        titleValue="Friday night ticketed set"
        live={{
          roomKind: "solo",
          accessMode: "paid",
          visibility: "public",
          setlistItems: [],
          setlistStatus: "ready",
          performerAllocations: [{ userId: "", role: "host", sharePct: 100 }],
        }}
        monetization={{ visible: true, priceUsd: "8.00" }}
        submit={{ canPost: true, label: "Go live", onSubmit: () => undefined }}
      />
    </ComposerFrame>
  ),
};

export const FileDownload: Story = {
  name: "File / Downloadable asset",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="file"
        availableTabs={["file"]}
        titleValue="Research export"
        textBodyValue="A deterministic downloadable file."
        file={{ upload: null, label: "research-export.csv" }}
      />
    </ComposerFrame>
  ),
};

// Keep the original React export names available while retaining the clearer
// state labels above in the rendered catalog.
export const AudiencePublic: Story = PublicAudience;
export const AudiencePublicDisabled: Story = MembersOnly;
export const LinkPasteUrl: Story = LinkPaste;
