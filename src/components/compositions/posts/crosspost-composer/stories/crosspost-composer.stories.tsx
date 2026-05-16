import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { CrosspostComposer } from "../crosspost-composer";
import type { CrosspostComposerProps, CrosspostTargetCommunity } from "../crosspost-composer.types";

const communities: CrosspostTargetCommunity[] = [
  {
    avatarSrc: "https://picsum.photos/seed/georgia-community/80/80",
    communityId: "@xn--nodehld6b",
    displayName: "@🇬🇪",
    status: "ready",
  },
  {
    avatarSrc: "https://picsum.photos/seed/music-community/80/80",
    communityId: "music",
    displayName: "music",
    status: "ready",
  },
];

const blockedCommunity: CrosspostTargetCommunity = {
  avatarSrc: "https://picsum.photos/seed/club-community/80/80",
  communityId: "vinyl-club",
  displayName: "vinyl-club",
  status: "needs_join",
  statusLabel: "You do not have posting access to this community.",
};

const baseComposer: CrosspostComposerProps = {
  communityPickerItems: communities,
  selectedCommunity: communities[0],
  source: {
    status: "available",
    communityLabel: "c/music",
    authorLabel: "u/ana",
    postType: "text",
    title: "What makes a great opener for a live set?",
    postHref: "#",
  },
  submit: {
    disabled: false,
    label: "Post",
    loading: false,
    onSubmit: () => undefined,
  },
  titleValue: "Bringing this here for the Georgian scene",
};

function InteractiveCrosspostComposer(props: CrosspostComposerProps) {
  const [selectedCommunity, setSelectedCommunity] = React.useState(props.selectedCommunity ?? null);
  const [title, setTitle] = React.useState(props.titleValue ?? "");

  const handleSelectCommunity = React.useCallback((communityId: string) => {
    setSelectedCommunity(
      props.communityPickerItems?.find((community) => community.communityId === communityId) ?? null,
    );
  }, [props.communityPickerItems]);

  return (
    <CrosspostComposer
      {...props}
      onSelectCommunity={handleSelectCommunity}
      onTitleValueChange={setTitle}
      selectedCommunity={selectedCommunity}
      submit={{
        ...props.submit,
        disabled: props.submit?.disabled || selectedCommunity?.status !== "ready",
      }}
      titleValue={title}
    />
  );
}

const meta = {
  title: "Compositions/Posts/CrosspostComposer",
  component: CrosspostComposer,
  args: baseComposer,
  decorators: [
    (Story: () => React.ReactNode) => (
      <div
        style={{
          marginInline: "auto",
          minHeight: "100dvh",
          width: "min(100vw - 32px, 760px)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CrosspostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadyTarget: Story = {
  name: "Ready Target",
  render: () => <InteractiveCrosspostComposer {...baseComposer} />,
};

export const ImageSource: Story = {
  name: "Source Type / Image",
  render: () => (
    <InteractiveCrosspostComposer
      {...baseComposer}
      source={{
        ...baseComposer.source,
        postType: "image",
        thumbnailAlt: "Crowd pressed against the stage at a small venue",
        thumbnailSrc: "https://picsum.photos/seed/crosspost-source-image/320/320",
        title: "Front row photo from last night",
      }}
      titleValue="Photo thread for the Georgian scene"
    />
  ),
};

export const VideoSource: Story = {
  name: "Source Type / Video",
  render: () => (
    <InteractiveCrosspostComposer
      {...baseComposer}
      source={{
        ...baseComposer.source,
        postType: "video",
        thumbnailAlt: "Performer lit by red stage lights",
        thumbnailSrc: "https://picsum.photos/seed/crosspost-source-video/320/320",
        title: "Five-minute live clip from the encore",
      }}
      titleValue="Encore clip worth discussing"
    />
  ),
};

export const LinkSource: Story = {
  name: "Source Type / Link",
  render: () => (
    <InteractiveCrosspostComposer
      {...baseComposer}
      source={{
        ...baseComposer.source,
        postType: "link",
        thumbnailAlt: "Venue entrance at night",
        thumbnailSrc: "https://picsum.photos/seed/crosspost-source-link/320/320",
        title: "Interview: rebuilding underground venues after a shutdown",
      }}
      titleValue="Useful venue context"
    />
  ),
};

export const SongSource: Story = {
  name: "Source Type / Song",
  render: () => (
    <InteractiveCrosspostComposer
      {...baseComposer}
      source={{
        ...baseComposer.source,
        postType: "song",
        thumbnailAlt: "Album artwork with a night road",
        thumbnailSrc: "https://picsum.photos/seed/crosspost-source-song/320/320",
        title: "New demo: Rustavi night drive",
      }}
      titleValue="New local demo"
    />
  ),
};

export const GatedTarget: Story = {
  name: "Gated Target",
  render: () => (
    <InteractiveCrosspostComposer
      {...baseComposer}
      selectedCommunity={blockedCommunity}
      submit={{
        disabled: true,
        error: "You do not have posting access to this community.",
        label: "Post",
      }}
    />
  ),
};

export const SourceUnavailable: Story = {
  name: "Source Unavailable",
  render: () => (
    <InteractiveCrosspostComposer
      {...baseComposer}
      source={{
        status: "deleted",
        communityLabel: "c/music",
      }}
      submit={{
        disabled: true,
        error: "The source post is no longer available.",
        label: "Post",
      }}
      titleValue="Discussion moved here"
    />
  ),
};

export const PublicSearchResults: Story = {
  name: "Public Search Results",
  render: () => (
    <InteractiveCrosspostComposer
      {...baseComposer}
      communityPickerItems={[
        ...communities,
        {
          avatarSrc: "https://picsum.photos/seed/georgia-folk/80/80",
          communityId: "georgian-folk",
          displayName: "georgian-folk",
          status: "ready",
        },
      ]}
      selectedCommunity={null}
      submit={{
        disabled: true,
        label: "Post",
      }}
    />
  ),
};
