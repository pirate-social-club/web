import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters, InteractivePostComposer } from "../story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Song",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

const sourceSearchResults = [
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
];

const sourceReferences = [
  {
    id: "ast_01abc",
    title: "Midnight Waves",
    subtitle: "DJ Solar",
  },
];

const sourceLicenseSummary = {
  sourceLicense: "Commercial remix",
  upstreamRoyaltyPct: 10,
  parentIpId: "0x1234567890abcdef1234567890abcdef12345678",
  licenseTermsId: "3",
  newRemixTerms: "Commercial remix, 10%, WIP",
};

export const Original: Story = {
  name: "Original",
  render: () => (
    <InteractivePostComposer
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
      license={{
        presetId: "non-commercial",
      }}
    />
  ),
};

export const LicenseNonCommercial: Story = {
  name: "License / Non-commercial",
  render: () => (
    <InteractivePostComposer
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
      license={{
        presetId: "non-commercial",
      }}
    />
  ),
};

export const LicenseCommercialUse: Story = {
  name: "License / Commercial use",
  render: () => (
    <InteractivePostComposer
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
      license={{
        presetId: "commercial-use",
      }}
    />
  ),
};

export const LicenseCommercialRemix: Story = {
  name: "License / Commercial remix",
  render: () => (
    <InteractivePostComposer
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
      license={{
        presetId: "commercial-remix",
        commercialRevSharePct: 10,
      }}
    />
  ),
};

export const RightsRemix: Story = {
  name: "Remix",
  render: () => (
    <InteractivePostComposer
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
        searchResults: sourceSearchResults,
        references: sourceReferences,
        licenseSummary: sourceLicenseSummary,
        sourceTermsAccepted: true,
      }}
    />
  ),
};

export const RemixSourceTermsBlocked: Story = {
  name: "Remix / Source terms blocked",
  render: () => (
    <InteractivePostComposer
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
        searchResults: sourceSearchResults,
        references: sourceReferences,
        licenseSummary: sourceLicenseSummary,
        sourceTermsAccepted: false,
      }}
      submit={{
        disabled: false,
        label: "Post",
      }}
    />
  ),
};

export const RemixSourceTermsAccepted: Story = {
  name: "Remix / Source terms accepted",
  render: () => (
    <InteractivePostComposer
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
        searchResults: sourceSearchResults,
        references: sourceReferences,
        licenseSummary: sourceLicenseSummary,
        sourceTermsAccepted: true,
      }}
      submit={{
        disabled: false,
        label: "Post",
      }}
    />
  ),
};

export const AnalysisMatch: Story = {
  name: "Analysis Match",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      mode="song"
      canCreateSongPost
      titleValue="Midnight Waves (unauthorized flip)"
      titleCountLabel="36/300"
      lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      songMode="remix"
      song={{
        genre: "Electronic",
        primaryLanguage: "English",
        coverLabel: "midnight-waves-cover.png",
      }}
      derivativeStep={{
        visible: true,
        required: true,
        trigger: "analysis",
        requirementLabel: "This audio matches an existing song. Publish it as a remix and keep the source track attached.",
        searchResults: sourceReferences,
        references: sourceReferences,
        licenseSummary: sourceLicenseSummary,
        sourceTermsAccepted: false,
      }}
    />
  ),
};

export const PaidUnlock: Story = {
  name: "Paid Unlock",
  render: () => (
    <InteractivePostComposer
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
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
        rightsAttested: true,
      }}
    />
  ),
};

export const PaidUnlockRegionalPricing: Story = {
  name: "Paid Unlock Regional Pricing",
  render: () => (
    <InteractivePostComposer
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
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
        regionalPricingAvailable: true,
        regionalPricingEnabled: true,
        rightsAttested: true,
      }}
    />
  ),
};

export const WithCharityContribution: Story = {
  name: "With Charity Contribution",
  render: () => (
    <InteractivePostComposer
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
        previewStartSeconds: "42",
      }}
      charityPartner={{
        partnerId: "endaoment:mock-charity-water",
        displayName: "charity: water",
        imageUrl: "https://placehold.co/96x96/111827/f97316?text=CW",
      }}
      charityContribution={{
        percentagePct: 10,
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
        rightsAttested: true,
      }}
    />
  ),
};
