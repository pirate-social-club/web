import type { AttachmentState, ComposerStep, ComposerTab } from "./post-composer.types";

export function isValidHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getComposeCanAdvance({
  attachment,
  body,
  title,
}: {
  attachment: AttachmentState;
  body: string;
  title: string;
}) {
  if (attachment?.kind === "link") return isValidHttpUrl(attachment.url);
  return Boolean(title.trim() || body.trim() || attachment);
}

export function composerTabHasDetailsStep(mode: ComposerTab) {
  return mode === "song" || mode === "video";
}

export function getNextComposerStep(current: ComposerStep, mode: ComposerTab): ComposerStep {
  if (current === "write") return composerTabHasDetailsStep(mode) ? "details" : "settings";
  if (current === "details") return "settings";
  if (current === "settings") return "publish";
  return current;
}

export function getPreviousComposerStep(current: ComposerStep, mode: ComposerTab): ComposerStep | undefined {
  if (current === "details") return "write";
  if (current === "settings") return composerTabHasDetailsStep(mode) ? "details" : "write";
  if (current === "publish") return "settings";
  return undefined;
}

export function canAdvanceComposerWriteStep({
  body,
  imageUploadPresent,
  linkUrl,
  mode,
  songAudioUploadPresent,
  title,
  videoUploadPresent,
}: {
  body: string;
  imageUploadPresent: boolean;
  linkUrl: string;
  mode: ComposerTab;
  songAudioUploadPresent: boolean;
  title: string;
  videoUploadPresent: boolean;
}) {
  if (mode === "song") return songAudioUploadPresent;
  if (mode === "video") return title.trim().length > 0 && videoUploadPresent;
  if (mode === "image") return title.trim().length > 0 && imageUploadPresent;
  if (mode === "link") return isValidHttpUrl(linkUrl);
  if (mode === "live") return true;
  return title.trim().length > 0 && body.trim().length > 0;
}

export function normalizePriceInput(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = normalized.split(".");
  const decimals = rest.join("").slice(0, 2);
  return rest.length ? `${whole}.${decimals}` : whole;
}

export function normalizeRoyaltyInput(value: string) {
  const normalized = value.replace(/[^\d]/g, "").slice(0, 3);
  const numeric = Math.min(100, Number(normalized || 0));
  return normalized ? String(numeric) : "";
}
