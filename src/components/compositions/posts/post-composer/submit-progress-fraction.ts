import type { SubmitProgress } from "./post-composer.types";

// Parse a "63%" detail into a 0–1 fraction, or null when there's no byte-progress.
export function parseDetailFraction(detail: string | undefined): number | null {
  const match = detail?.match(/^(\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  return Math.min(Math.max(Number(match[1]) / 100, 0), 1);
}

// A single monotonic 0→1 fill for the whole submit — the bar only ever moves left
// to right, once. Never indeterminate.
// - Multi-step flows (song/video): fill by completed steps, interpolating a byte-%
//   within the current step. This stays monotonic ONLY while the emitted
//   currentIndex is monotonic, so callers must report steps in order (see the
//   ordering in video.ts submitVideoPost).
// - Single-upload flows (image/live cover): the upload is the entire wait, so fill
//   directly by its real byte-% — 0 before it starts, 1 once it's past.
export function submitProgressFraction(progress: SubmitProgress): number {
  const within = parseDetailFraction(progress.detail);

  if (progress.display === "pipeline") {
    const total = Math.max(progress.totalSteps, 1);
    const reached = Math.min(Math.max(progress.currentIndex, 0), total);
    // A step reporting bytes fills its own band [(reached-1)/total, reached/total];
    // a step with no byte-progress counts as reached (end of its band) so the last
    // step lands at 100%.
    return within != null ? ((reached - 1) + within) / total : reached / total;
  }

  // activity: the bar tracks the one dominant upload directly.
  if (progress.phase === "uploading_media" || progress.phase === "preparing_media") {
    return within ?? 0;
  }
  if (progress.phase === "validating") return 0;
  return 1; // past the upload (publishing / listing / registration)
}
