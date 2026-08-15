import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { PostComposer } from "./post-composer";
import { baseComposer } from "./story-fixtures";
import { ComposerFrame, InteractiveComposer } from "./story-helpers";

const meta = {
  title: "App/Posts/PostComposer/Composer/Song",
  component: PostComposer,
  args: baseComposer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PostComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

const song = {
  title: "Midnight Waves",
  genre: "Electronic",
  primaryLanguage: "English",
  primaryAudioLabel: "midnight-waves.mp3",
  coverLabel: "midnight-waves-cover.svg",
};
export const Original: Story = {
  name: "Original / Details",
  render: () => (
    <ComposerFrame>
      <InteractiveComposer
        {...baseComposer}
        mode="song"
        composerStep="details"
        songMode="original"
        song={song}
        titleValue="Midnight Waves"
        lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      />
    </ComposerFrame>
  ),
};

export const RemixSource: Story = {
  name: "Remix / Source and terms",
  render: () => (
    <ComposerFrame>
      <InteractiveComposer
        {...baseComposer}
        mode="song"
        composerStep="details"
        songMode="remix"
        song={song}
        derivativeStep={{
          visible: true,
          required: true,
          trigger: "remix",
          searchResults: [{ id: "asset-sunset", title: "Sunset Driver", subtitle: "lena-wave.pirate" }],
          references: [{ id: "asset-sunset", title: "Sunset Driver", subtitle: "lena-wave.pirate" }],
          sourceTermsAccepted: true,
          licenseSummary: {
            sourceLicense: "Commercial remix",
            upstreamRoyaltyPct: 10,
            newRemixTerms: "Commercial remix, 10%",
          },
        }}
      />
    </ComposerFrame>
  ),
};

export const LicenseSettings: Story = {
  name: "Settings / License and royalties",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="song"
        composerStep="settings"
        song={song}
        license={{ presetId: "commercial-remix", commercialRevSharePct: 10 }}
        monetization={{ visible: true, priceUsd: "4.99", regionalPricingAvailable: true }}
      />
    </ComposerFrame>
  ),
};

export const PublishProgress: Story = {
  name: "Publish / Processing",
  render: () => (
    <ComposerFrame>
      <PostComposer
        {...baseComposer}
        mode="song"
        composerStep="publish"
        song={song}
        submit={{
          canPost: true,
          loading: true,
          progress: {
            phase: "processing_media",
            label: "Preparing song",
            currentIndex: 3,
            totalSteps: 6,
            display: "pipeline",
          },
        }}
      />
    </ComposerFrame>
  ),
};
