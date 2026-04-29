import * as React from "react";

import { getComposeCanAdvance } from "../../post-composer-utils";
import type {
  AssetLicensePresetId,
  AttachmentKind,
  AttachmentState,
  SongDetailsState,
  VideoDetailsState,
} from "../../post-composer.types";
import { revokeSongDetailsPreviews, revokeUploadValue } from "../../post-composer-upload-utils";

export type FlowStep = "compose" | "video-details" | "song-details" | "settings" | "review";

const defaultVideoDetails: VideoDetailsState = {
  posterFrameSeconds: "0",
  thumbnail: null,
};

const defaultSongDetails: SongDetailsState = {
  canvasVideo: null,
  coverArt: null,
  genre: "Electronic",
  instrumentalStem: null,
  language: "English",
  lyrics: "",
  vocalStem: null,
};

function revokePreviewUrl(attachment: AttachmentState) {
  if (attachment && "previewUrl" in attachment && attachment.previewUrl) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

function makeAttachment(kind: AttachmentKind): AttachmentState {
  switch (kind) {
    case "link":
      return { kind, url: "" };
    case "image":
      return { kind, label: "No image selected" };
    case "video":
      return { kind, label: "No video selected" };
    case "song":
      return { kind, label: "No audio selected" };
    case "live":
      return { kind };
  }
}

function getPreviousStep(step: FlowStep, attachment: AttachmentState): FlowStep {
  if (step === "review") return "settings";
  if (step === "settings") {
    if (attachment?.kind === "song") return "song-details";
    if (attachment?.kind === "video") return "video-details";
  }
  return "compose";
}

function getNextStep(step: FlowStep, attachment: AttachmentState): FlowStep {
  if (step === "compose") {
    if (attachment?.kind === "song") return "song-details";
    if (attachment?.kind === "video") return "video-details";
    return "settings";
  }
  if (step === "song-details" || step === "video-details") return "settings";
  if (step === "settings") return "review";
  return step;
}

export function useAttachmentFlowState({
  initialAttachment = null,
  initialStep = "compose",
}: {
  initialAttachment?: AttachmentState;
  initialStep?: FlowStep;
} = {}) {
  const [step, setStep] = React.useState<FlowStep>(initialStep);
  const [title, setTitle] = React.useState("What is the best Ye opener?");
  const [body, setBody] = React.useState("");
  const [attachment, setAttachment] = React.useState<AttachmentState>(initialAttachment);
  const [identity, setIdentity] = React.useState<"pseudonym" | "anonymous">("pseudonym");
  const [visibility, setVisibility] = React.useState<"public" | "community">("public");
  const [access, setAccess] = React.useState<"free" | "paid">("free");
  const [price, setPrice] = React.useState("4.99");
  const [royaltyPercent, setRoyaltyPercent] = React.useState("15");
  const [license, setLicense] = React.useState<AssetLicensePresetId>("non-commercial");
  const [songDetails, setSongDetails] = React.useState<SongDetailsState>(defaultSongDetails);
  const [videoDetails, setVideoDetails] = React.useState<VideoDetailsState>(defaultVideoDetails);

  React.useEffect(() => {
    return () => revokePreviewUrl(attachment);
  }, [attachment]);

  React.useEffect(() => {
    return () => revokeUploadValue(videoDetails.thumbnail);
  }, [videoDetails.thumbnail]);

  React.useEffect(() => {
    const coverArt = songDetails.coverArt;
    const canvasVideo = songDetails.canvasVideo;
    return () => {
      revokeUploadValue(coverArt);
      revokeUploadValue(canvasVideo);
    };
  }, [songDetails.coverArt, songDetails.canvasVideo]);

  const replaceAttachment = React.useCallback(
    (next: AttachmentState) => {
      if (attachment?.kind === "song" && next?.kind !== "song") {
        revokeSongDetailsPreviews(songDetails);
        setSongDetails(defaultSongDetails);
      }
      if (attachment?.kind === "video" && next?.kind !== "video") {
        revokeUploadValue(videoDetails.thumbnail);
        setVideoDetails(defaultVideoDetails);
      }
      setAttachment((current) => {
        revokePreviewUrl(current);
        return next;
      });
    },
    [attachment, songDetails, videoDetails.thumbnail],
  );

  function selectAttachment(kind: AttachmentKind) {
    replaceAttachment(makeAttachment(kind));
  }

  function handleFile(kind: "image" | "video" | "song", files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (kind === "song") {
      replaceAttachment({ kind, label: file.name });
      return;
    }
    replaceAttachment({ kind, label: file.name, previewUrl: URL.createObjectURL(file) });
  }

  function goBack() {
    setStep((current) => getPreviousStep(current, attachment));
  }

  function goNext() {
    setStep((current) => getNextStep(current, attachment));
  }

  const canAdvance = step !== "compose" || getComposeCanAdvance({ attachment, body, title });

  return {
    access,
    attachment,
    body,
    canAdvance,
    goBack,
    goNext,
    handleFile,
    identity,
    license,
    price,
    replaceAttachment,
    royaltyPercent,
    selectAttachment,
    setAccess,
    setBody,
    setIdentity,
    setLicense,
    setPrice,
    setRoyaltyPercent,
    setSongDetails,
    setTitle,
    setVideoDetails,
    setVisibility,
    songDetails,
    step,
    title,
    videoDetails,
    visibility,
  };
}
