import * as React from "react";

import type { PostComposerProps } from "../post-composer.types";

export const baseComposer: PostComposerProps = {
  clubName: "c/yeezy",
  clubAvatarSrc: "https://picsum.photos/seed/yeezy/80/80",
  mode: "text",
  availableTabs: ["text", "image", "video", "link", "song", "live"],
  canCreateSongPost: true,
  titleValue: "What is the best Ye opener?",
  titleCountLabel: "29/300",
  textBodyValue:
    "Keep it close to Reddit: title first, content next, extras collapsed. Pirate-specific flows should only appear when the content actually calls for them.",
  audience: {
    visibility: "public",
  },
  identity: {
    allowAnonymousIdentity: true,
    allowQualifiersOnAnonymousPosts: true,
    identityMode: "public",
    publicHandle: "@saint-pablo",
    anonymousLabel: "anon_mercury-17",
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
        suppressionReason: "Already required for posting in this community.",
      },
    ],
    selectedQualifierIds: [],
    helpText:
      "Attach optional qualifiers to add authority. Anything already required by this community stays hidden.",
  },
};

export const composerDecorator = [
  (Story: () => React.ReactNode) => (
    <div style={{ width: "min(100vw - 32px, 980px)" }}>
      <Story />
    </div>
  ),
];
