import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostComposer } from "../../post-composer";
import { baseComposer, composerDecorator, composerParameters } from "../story-helpers";

const meta = {
  title: "Compositions/Posts/PostComposer/Text",
  component: PostComposer,
  args: baseComposer,
  decorators: composerDecorator,
  parameters: composerParameters,
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Compose: Story = {
  name: "Default",
  render: () => <PostComposer {...baseComposer} />,
};

export const PublicHandleOnly: Story = {
  name: "Public Handle Only",
  render: () => (
    <PostComposer
      {...baseComposer}
      identity={{
        allowAnonymousIdentity: true,
        identityMode: "public",
        publicHandle: "@saint-pablo",
        anonymousLabel: "anon_amber-anchor-00",
        availableQualifiers: [],
      }}
    />
  ),
};

export const QualifiersDropdown: Story = {
  name: "Qualifiers Dropdown",
  render: () => (
    <PostComposer
      {...baseComposer}
      identity={{
        allowAnonymousIdentity: true,
        allowQualifiersOnAnonymousPosts: true,
        identityMode: "anonymous",
        publicHandle: "@saint-pablo",
        anonymousLabel: "anon_amber-anchor-00",
        availableQualifiers: [
          {
            qualifierId: "qlf_unique_human",
            label: "Unique Human",
            description: "Verified uniqueness",
            sensitivityLevel: "low",
            sourceProvider: "self",
            sourceField: "unique_human",
            redundancyKey: "unique_human:true",
          },
          {
            qualifierId: "qlf_age_over_18",
            label: "18+",
            description: "Adult",
            sensitivityLevel: "low",
            sourceProvider: "self",
            sourceField: "minimumAge",
            redundancyKey: "age_over_18:true",
          },
          {
            qualifierId: "qlf_nationality_us",
            label: "US National",
            description: "Nationality",
            sensitivityLevel: "high",
            sourceProvider: "self",
            sourceField: "nationality",
            redundancyKey: "nationality:US",
            suppressedByClubGate: true,
          },
          {
            qualifierId: "qlf_very_palm_scan",
            label: "Palm Scan",
            description: "Very biometric verification",
            sensitivityLevel: "low",
            sourceProvider: "very",
            sourceField: "palm_scan",
          },
        ],
        selectedQualifierIds: ["qlf_unique_human", "qlf_age_over_18", "qlf_very_palm_scan"],
        helpText:
          "Select any qualifiers that add authority to this post. Community-required ones are omitted.",
      }}
    />
  ),
};

export const GateSuppressesQualifier: Story = {
  name: "Gate Suppresses Qualifier",
  render: () => (
    <PostComposer
      {...baseComposer}
      clubName="c/america"
      identity={{
        allowAnonymousIdentity: true,
        identityMode: "anonymous",
        publicHandle: "@saint-pablo",
        anonymousLabel: "anon_lunar-echo-42",
        availableQualifiers: [
          {
            qualifierId: "qlf_unique_human",
            label: "Unique Human",
            description: "Verified uniqueness",
            sensitivityLevel: "low",
            sourceProvider: "self",
            sourceField: "unique_human",
            redundancyKey: "unique_human:true",
          },
          {
            qualifierId: "qlf_nationality_us",
            label: "US National",
            description: "Nationality",
            sensitivityLevel: "high",
            sourceProvider: "self",
            sourceField: "nationality",
            redundancyKey: "nationality:US",
            suppressedByClubGate: true,
            suppressionReason: "US nationality is already required to post in this community.",
          },
        ],
        selectedQualifierIds: ["qlf_unique_human"],
        helpText:
          "US nationality is already enforced by the community gate, so it does not appear as an optional qualifier.",
      }}
    />
  ),
};

export const AnonymousWithoutQualifierDisclosure: Story = {
  name: "Anonymous Without Qualifier Disclosure",
  render: () => (
    <PostComposer
      {...baseComposer}
      identity={{
        allowAnonymousIdentity: true,
        allowQualifiersOnAnonymousPosts: false,
        identityMode: "anonymous",
        publicHandle: "@saint-pablo",
        anonymousLabel: "anon_amber-anchor-00",
        availableQualifiers: [
          {
            qualifierId: "qlf_unique_human",
            label: "Unique Human",
            description: "Verified uniqueness",
            sensitivityLevel: "low",
            sourceProvider: "self",
            sourceField: "unique_human",
            redundancyKey: "unique_human:true",
          },
          {
            qualifierId: "qlf_age_over_18",
            label: "18+",
            description: "Adult",
            sensitivityLevel: "low",
            sourceProvider: "self",
            sourceField: "minimumAge",
            redundancyKey: "age_over_18:true",
          },
        ],
        selectedQualifierIds: [],
        helpText:
          "This community allows anonymous posting but does not allow qualifier disclosure on anonymous posts.",
      }}
    />
  ),
};

export const CommunityInRestrictedCommunity: Story = {
  name: "Community In Restricted Community",
  render: () => (
    <PostComposer
      {...baseComposer}
      clubName="c/us-politics"
      audience={{
        visibility: "members_only",
        publicOptionEnabled: false,
        publicOptionDisabledReason: "This community already limits who can read posts.",
      }}
      identity={{
        ...baseComposer.identity,
        helpText:
          "This post is limited to joined members.",
      }}
    />
  ),
};

export const CommunityInPublicCommunity: Story = {
  name: "Community In Public Community",
  render: () => (
    <PostComposer
      {...baseComposer}
      clubName="c/industry-whispers"
      audience={{
        visibility: "members_only",
        publicOptionEnabled: true,
      }}
    />
  ),
};
