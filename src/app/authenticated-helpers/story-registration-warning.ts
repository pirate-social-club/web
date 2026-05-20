import type { Asset } from "@pirate/api-contracts";

type StoryRegistrationWarning = {
  title: string;
  description: string;
};

function contentLabel(postType: "song" | "video"): string {
  return postType === "video" ? "video" : "song";
}

export function formatStoryRegistrationError(error: string | null | undefined): string {
  const normalized = error?.trim() ?? "";
  if (normalized.includes("story_royalty_config_missing")) {
    return "Story royalty configuration is missing.";
  }
  if (normalized.includes("story_royalty_registration_unavailable")) {
    return "Story registration is unavailable.";
  }
  if (!normalized) {
    return "Story registration did not complete.";
  }
  return normalized
    .replace(/^royalty_registration_failed:/, "")
    .replace(/_/g, " ");
}

export function buildStoryRegistrationCreationWarning(
  asset: Pick<Asset, "story_royalty_registration_status" | "story_error"> | null | undefined,
  postType: "song" | "video",
): StoryRegistrationWarning | null {
  const label = contentLabel(postType);
  if (asset?.story_royalty_registration_status === "pending") {
    return {
      title: `${label[0]?.toUpperCase()}${label.slice(1)} published. Story IP registration is still in progress.`,
      description: `It will not appear as a remix source until registration completes.`,
    };
  }
  if (asset?.story_royalty_registration_status === "failed") {
    return {
      title: `${label[0]?.toUpperCase()}${label.slice(1)} published, but Story IP registration failed.`,
      description: `${formatStoryRegistrationError(asset.story_error)} It will not appear as a remix source until registration is retried successfully.`,
    };
  }
  return null;
}
