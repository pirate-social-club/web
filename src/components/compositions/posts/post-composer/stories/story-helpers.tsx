import * as React from "react";

import { PostComposer } from "../post-composer";
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
    "Looking back through the discography, there are so many iconic intro tracks. From the soul samples of 'We Don't Care' to the stadium-sized energy of 'Ultralight Beam', what is the best Ye opener?",
  onClose: () => undefined,
  identity: {
    allowAnonymousIdentity: true,
    allowQualifiersOnAnonymousPosts: true,
    identityMode: "public",
    publicHandle: "@saint-pablo",
    realNameLabel: "clyeezy.pirate",
    reputationLabel: "Rep: 1.2k",
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
        suppressionReason: "Already required for posting in this community.",
      },
    ],
    selectedQualifierIds: [],
    helpText:
      "Attach optional qualifiers to add authority. Anything already required by this community stays hidden.",
  },
  submit: {
    disabled: false,
    label: "Post",
    loading: false,
    onSubmit: () => undefined,
  },
};

export const composerDecorator = [
  (Story: () => React.ReactNode) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        marginInline: "auto",
        minHeight: "100dvh",
        width: "min(100vw - 32px, 980px)",
      }}
    >
      <Story />
    </div>
  ),
];

export const composerParameters = {
  layout: "fullscreen",
};

export function InteractivePostComposer(props: PostComposerProps) {
  const [composerStep, setComposerStep] = React.useState(props.composerStep);
  const [license, setLicense] = React.useState(props.license);
  const [derivativeStep, setDerivativeStep] = React.useState(props.derivativeStep);
  const [live, setLive] = React.useState(props.live);
  const [monetization, setMonetization] = React.useState(props.monetization);
  const [song, setSong] = React.useState(props.song);
  const [songMode, setSongMode] = React.useState(props.songMode);

  return (
    <PostComposer
      {...props}
      composerStep={composerStep}
      derivativeStep={derivativeStep}
      license={license}
      live={live}
      monetization={monetization}
      onComposerStepChange={setComposerStep}
      onDerivativeStepChange={setDerivativeStep}
      onLicenseChange={(next) => setLicense(next)}
      onLiveChange={setLive}
      onMonetizationChange={setMonetization}
      onSongChange={setSong}
      onSongModeChange={(next) => setSongMode(next)}
      song={song}
      songMode={songMode}
    />
  );
}
