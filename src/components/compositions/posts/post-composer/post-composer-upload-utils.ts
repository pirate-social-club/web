import type { ComposerUploadValue, SongDetailsState } from "./post-composer.types";

export function revokeUploadValue(value: ComposerUploadValue) {
  if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
}

export function revokeSongDetailsPreviews(value: SongDetailsState) {
  revokeUploadValue(value.coverArt);
  revokeUploadValue(value.canvasVideo);
}
