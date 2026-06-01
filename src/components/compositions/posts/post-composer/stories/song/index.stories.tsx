import type { Meta, StoryObj } from "@storybook/react-vite";

import { buildStarterPricingPolicyDraft } from "@/app/authenticated-helpers/moderation-helpers";
import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters, InteractivePostComposer } from "../story-helpers";
import type { SubmitProgress } from "../../post-composer.types";

const meta = {
  title: "Compositions/Posts/PostComposer/Composer/Song",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

const sourceSearchResults = [
  {
    id: "story:asset:asset_ast_01abc",
    title: "Palestine, Don't Cry",
    subtitle: "amina.pirate",
    licensePreset: "commercial-remix" as const,
    upstreamRoyaltyPct: 10,
    parentIpId: "0x1234567890abcdef1234567890abcdef12345678",
    licenseTermsId: "3",
  },
  {
    id: "story:asset:asset_ast_01def",
    title: "Midnight Waves",
    subtitle: "dj-solar.eth",
    licensePreset: "commercial-remix" as const,
    upstreamRoyaltyPct: 15,
    parentIpId: "0xabcdef1234567890abcdef1234567890abcdef12",
    licenseTermsId: "8",
  },
];

const sourceReferences = [
  {
    id: "story:asset:asset_ast_01abc",
    title: "Palestine, Don't Cry",
    subtitle: "amina.pirate",
    licensePreset: "commercial-remix" as const,
    upstreamRoyaltyPct: 10,
    parentIpId: "0x1234567890abcdef1234567890abcdef12345678",
    licenseTermsId: "3",
  },
];

const sourceLicenseSummary = {
  sourceLicense: "Commercial remix",
  upstreamRoyaltyPct: 10,
  parentIpId: "0x1234567890abcdef1234567890abcdef12345678",
  licenseTermsId: "3",
  newRemixTerms: "Commercial remix, 10%, WIP",
};

const analysisMatchMessage = "Your uploaded song is too similar to an existing song.";

const starterPolicy = buildStarterPricingPolicyDraft();

const assignmentsByTier = new Map<string, string[]>();
for (const assignment of starterPolicy.countryAssignments) {
  const list = assignmentsByTier.get(assignment.tier_key) ?? [];
  list.push(assignment.country_code);
  assignmentsByTier.set(assignment.tier_key, list);
}

const regionalPricingPreview = {
  defaultTierKey: starterPolicy.defaultTierKey,
  tiers: starterPolicy.tiers.map((tier) => ({
    tierKey: tier.tier_key,
    displayName: tier.display_name,
    adjustmentType: tier.adjustment_type as "multiplier",
    adjustmentValue: tier.adjustment_value,
    countryCodes: assignmentsByTier.get(tier.tier_key) ?? [],
  })),
};

function svgCoverFile(name: string, label: string): File {
  const escapedLabel = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#9333ea"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)" rx="24"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="28" font-family="sans-serif" font-weight="600">${escapedLabel}</text></svg>`;
  return new File([new Blob([svg], { type: "image/svg+xml" })], name, { type: "image/svg+xml" });
}

const midnightCoverFile = svgCoverFile("midnight-waves-cover.svg", "Midnight Waves");
const benefitCoverFile = svgCoverFile("benefit-single-cover.svg", "Benefit Single");
const demoAudioFile = new File([new Uint8Array([1, 2, 3, 4])], "demo-song.mp3", { type: "audio/mpeg" });

function progress(input: {
  currentIndex: number;
  detail?: string;
  label: string;
  phase: SubmitProgress["phase"];
  totalSteps?: number;
}): SubmitProgress {
  return {
    currentIndex: input.currentIndex,
    detail: input.detail,
    label: input.label,
    phase: input.phase,
    totalSteps: input.totalSteps ?? 9,
  };
}

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
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
        coverLabel: "midnight-waves-cover.png",
      }}
      license={{
        presetId: "non-commercial",
      }}
    />
  ),
};

export const DetailsWithGeniusAnnotations: Story = {
  name: "Details / Genius annotations",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="details"
      mode="song"
      canCreateSongPost
      titleValue="Midnight Waves"
      titleCountLabel="14/300"
      lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      song={{
        title: "Midnight Waves",
        genre: "Electronic",
        geniusAnnotationsUrl: "https://genius.com/34172986",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
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
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
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
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
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
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
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
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
        coverLabel: "midnight-waves-cover.png",
      }}
      derivativeStep={{
        visible: true,
        required: true,
        trigger: "remix",
        query: "palestine",
        searchResults: sourceSearchResults,
        references: sourceSearchResults,
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
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
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
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
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
  name: "Publish step / Analysis error only",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      canCreateSongPost
      titleValue="Midnight Waves (unauthorized flip)"
      titleCountLabel="36/300"
      lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      songMode="original"
      song={{
        genre: "Electronic",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
        coverLabel: "midnight-waves-cover.png",
      }}
      license={{
        presetId: "non-commercial",
      }}
      submit={{
        canContinue: false,
        canPost: false,
        error: analysisMatchMessage,
        label: "Post",
      }}
    />
  ),
};

export const SubmittingUploadingAudio: Story = {
  name: "Publish step / Submitting / Uploading audio",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      canCreateSongPost
      titleValue="Midnight Waves"
      titleCountLabel="14/300"
      lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      song={{
        genre: "Electronic",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
        coverLabel: "midnight-waves-cover.png",
      }}
      license={{
        presetId: "non-commercial",
      }}
      submit={{
        canContinue: true,
        canPost: true,
        label: "Post",
        loading: true,
        progress: progress({
          currentIndex: 2,
          label: "Uploading audio",
          phase: "uploading_media",
        }),
      }}
    />
  ),
};

export const SubmittingAnalyzingRights: Story = {
  name: "Publish step / Submitting / Analyzing rights",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      canCreateSongPost
      titleValue="Midnight Waves"
      titleCountLabel="14/300"
      lyricsValue="Meet me in the red light / carry the chorus through the floor..."
      song={{
        genre: "Electronic",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: midnightCoverFile,
        coverLabel: "midnight-waves-cover.png",
      }}
      license={{
        presetId: "non-commercial",
      }}
      submit={{
        canContinue: true,
        canPost: true,
        label: "Post",
        loading: true,
        progress: progress({
          currentIndex: 5,
          label: "Checking rights",
          phase: "checking_rights",
        }),
      }}
    />
  ),
};

export const SubmittingGeneratingPreview: Story = {
  name: "Publish step / Submitting / Generating preview",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: benefitCoverFile,
        coverLabel: "benefit-single-cover.png",
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
      }}
      submit={{
        canContinue: true,
        canPost: true,
        label: "Post",
        loading: true,
        progress: progress({
          currentIndex: 6,
          detail: "Attempt 4 of 31",
          label: "Generating preview",
          phase: "processing_media",
        }),
      }}
    />
  ),
};

export const SubmittingCreatingListing: Story = {
  name: "Publish step / Submitting / Creating listing",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: benefitCoverFile,
        coverLabel: "benefit-single-cover.png",
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
      }}
      submit={{
        canContinue: true,
        canPost: true,
        label: "Post",
        loading: true,
        progress: progress({
          currentIndex: 8,
          label: "Creating listing",
          phase: "creating_listing",
        }),
      }}
    />
  ),
};

export const RetryableFailure: Story = {
  name: "Publish step / Retryable failure",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: benefitCoverFile,
        coverLabel: "benefit-single-cover.png",
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
      }}
      submit={{
        canContinue: true,
        canPost: true,
        error: "Song preview is still processing. Try again in a moment.",
        label: "Post",
        progress: progress({
          currentIndex: 6,
          label: "Generating preview",
          phase: "processing_media",
        }),
      }}
    />
  ),
};

export const PostPublished: Story = {
  name: "Publish step / Post published",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="publish"
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        primaryAudioUpload: demoAudioFile,
        coverUpload: benefitCoverFile,
        coverLabel: "benefit-single-cover.png",
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
      }}
      submit={{
        canContinue: true,
        canPost: true,
        label: "Post",
        loading: true,
        progress: progress({
          currentIndex: 9,
          label: "Post published",
          phase: "done",
        }),
      }}
    />
  ),
};

export const PaidUnlock: Story = {
  name: "Paid Unlock",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        secondaryLanguage: "French",
        primaryAudioUpload: demoAudioFile,
        coverUpload: benefitCoverFile,
        coverLabel: "benefit-single-cover.png",
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
      }}
    />
  ),
};

export const PaidUnlockRegionalPricing: Story = {
  name: "Pay to access / Self.xyz regional pricing",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        secondaryLanguage: "French",
        primaryAudioUpload: demoAudioFile,
        coverUpload: benefitCoverFile,
        coverLabel: "benefit-single-cover.png",
        previewStartSeconds: "42",
      }}
      monetization={{
        visible: true,
        priceUsd: "3.99",
        regionalPricingAvailable: true,
        regionalPricingEnabled: true,
      }}
      regionalPricingPreview={regionalPricingPreview}
    />
  ),
};

export const WithCharityContribution: Story = {
  name: "With Charity Contribution",
  render: () => (
    <InteractivePostComposer
      {...baseComposer}
      composerStep="settings"
      mode="song"
      canCreateSongPost
      titleValue="Benefit single for the club drop"
      titleCountLabel="36/300"
      lyricsValue="Raise the room up / hold the line / send the chorus over..."
      song={{
        genre: "R&B",
        primaryLanguage: "English",
        secondaryLanguage: "French",
        primaryAudioUpload: demoAudioFile,
        coverUpload: benefitCoverFile,
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
      }}
    />
  ),
};
