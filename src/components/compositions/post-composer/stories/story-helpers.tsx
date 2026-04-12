import * as React from "react";
import { fn } from "storybook/test";

import { useIsMobile } from "@/hooks/use-mobile";
import { PostComposer } from "../post-composer";
import type {
  PostComposerProps,
  PostComposerSubmitPayload,
} from "../post-composer.types";

export const baseComposer: PostComposerProps = {
  clubName: "c/yeezy",
  clubAvatarSrc: "https://picsum.photos/seed/yeezy/80/80",
  mode: "text",
  availableTabs: ["text", "image", "video", "link", "song", "live"],
  canCreateSongPost: true,
  titleValue: "What is the best Ye opener?",
  titleCountLabel: "29/300",
  textBodyValue:
    "Keep it close to Reddit: title first, content next, extras collapsed.\n\n- Markdown should be first-class\n- Pirate-specific flows should stay tucked away",
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

const submitAction = fn();

export function ComposerWithSubmitPreview(props: PostComposerProps) {
  const isMobile = useIsMobile();
  const [submitted, setSubmitted] =
    React.useState<PostComposerSubmitPayload | null>(null);

  const handleSubmit = React.useCallback((payload: PostComposerSubmitPayload) => {
    submitAction(payload);
    setSubmitted(payload);
  }, []);

  return (
    <div className="space-y-4">
      <PostComposer
        {...props}
        mobileChrome={isMobile ? {
          destinationLabel: props.clubName,
          onClose: () => {},
          onDestinationClick: () => {},
          postLabel: "Post",
        } : undefined}
        onSubmit={handleSubmit}
      />
      {isMobile ? null : (
        <div className="rounded-[var(--radius-xl)] border border-border-soft bg-card px-4 py-4">
          <div className="text-base font-semibold text-foreground">
            Last submit payload
          </div>
          <pre className="mt-3 overflow-x-auto text-base leading-6 text-muted-foreground">
            {submitted
              ? JSON.stringify(submitted, null, 2)
              : "Submit the composer to inspect the payload."}
          </pre>
        </div>
      )}
    </div>
  );
}
