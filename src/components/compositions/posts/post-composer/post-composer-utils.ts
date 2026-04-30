import type { AttachmentState, ComposerStep, ComposerTab } from "./post-composer.types";

export function isValidHttpUrl(value: string) {
  return normalizeHttpUrl(value) !== null;
}

export function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parse = (candidate: string) => {
    try {
      const url = new URL(candidate);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const parsed = parse(trimmed);
  if (parsed) return parsed;

  if (/\s/.test(trimmed)) return null;

  const pathStart = trimmed.search(/[/?#]/);
  const authorityCandidate = pathStart === -1 ? trimmed : trimmed.slice(0, pathStart);
  const colonIndex = authorityCandidate.indexOf(":");
  if (colonIndex > 0) {
    const hostCandidate = authorityCandidate.slice(0, colonIndex).toLowerCase();
    const portLikeHost = hostCandidate.includes(".")
      || hostCandidate === "localhost"
      || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostCandidate)
      || hostCandidate.startsWith("[");
    if (!portLikeHost) return null;
  }

  const normalizedTrimmed = trimmed.toLowerCase();
  const schemelessWebUrl = trimmed.includes(".")
    || normalizedTrimmed.startsWith("localhost")
    || /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:[/?#]|$)/.test(trimmed)
    || /^\[[\da-f:]+\](?::\d+)?(?:[/?#]|$)/i.test(trimmed);

  if (!schemelessWebUrl) return null;

  return parse(`https://${trimmed}`);
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
