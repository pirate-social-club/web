import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator } from "../story-helpers";

const meta = {
  title: "Compositions/PostComposer/Song",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Original: Story = {
  name: "Original",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="song"
      canCreateSongPost
      titleValue="Midnight Waves"
      titleCountLabel="14/300"
      lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      song={{
        genre: "Electronic",
        primaryLanguage: "English",
        coverLabel: "midnight-waves-cover.png",
      }}
    />
  ),
};

export const RightsRemix: Story = {
  name: "Remix",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="song"
      canCreateSongPost
      titleValue="Midnight Waves (club mix)"
      titleCountLabel="27/300"
      lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      songMode="remix"
      song={{
        genre: "Electronic",
        primaryLanguage: "English",
        secondaryLanguage: "Spanish",
        coverLabel: "midnight-waves-cover.png",
      }}
      derivativeStep={{
        visible: true,
        required: true,
        trigger: "remix",
        query: "midnight waves original",
        searchResults: [
          {
            id: "ast_01abc",
            title: "Midnight Waves",
            subtitle: "DJ Solar",
          },
          {
            id: "ast_01def",
            title: "Midnight Waves (Acoustic)",
            subtitle: "DJ Solar",
          },
        ],
        references: [
          {
            id: "ast_01abc",
            title: "Midnight Waves",
            subtitle: "DJ Solar",
          },
        ],
        requirementLabel: "Attach the original track before posting.",
      }}
    />
  ),
};

export const MonetizedDonationFlow: Story = {
  name: "Monetized Donation",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        secondaryLanguage: "French",
        coverLabel: "benefit-single-cover.png",
      }}
      monetization={{
        visible: true,
        license: "commercial_remix",
        revenueSharePct: 15,
        priceUsd: "3.99",
        openEdition: false,
        maxSupply: "500",
        donationAvailable: true,
        donationOptIn: true,
        donationPartnerId: "musicares",
        donationPartnerName: "MusiCares",
        donationSharePct: 10,
        rightsAttested: true,
      }}
    />
  ),
};

export const NonCommercialSong: Story = {
  name: "Non-Commercial",
  render: () => (
    <PostComposer
      {...baseComposer}
      mode="song"
      canCreateSongPost
      titleValue="Lo-fi beats for studying"
      titleCountLabel="28/300"
      lyricsValue="Rain on the window / pages turning slowly..."
      song={{
        genre: "Ambient",
        primaryLanguage: "English",
        coverLabel: "lofi-beats-cover.png",
      }}
      monetization={{
        visible: true,
        license: "non_commercial",
      }}
    />
  ),
};
