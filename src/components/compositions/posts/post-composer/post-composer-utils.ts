import type { AttachmentState, ComposerStep, ComposerTab, LiveComposerState } from "./post-composer.types";
export { isValidHttpUrl, normalizeHttpUrl } from "@/lib/http-url";
import { isValidHttpUrl } from "@/lib/http-url";

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
  liveState,
  mode,
  songAudioUploadPresent,
  title,
  videoUploadPresent,
}: {
  body: string;
  imageUploadPresent: boolean;
  linkUrl: string;
  liveState?: LiveComposerState;
  mode: ComposerTab;
  songAudioUploadPresent: boolean;
  title: string;
  videoUploadPresent: boolean;
}) {
  if (mode === "song") return songAudioUploadPresent;
  if (mode === "video") return title.trim().length > 0 && videoUploadPresent;
  if (mode === "image") return title.trim().length > 0 && imageUploadPresent;
  if (mode === "link") return isValidHttpUrl(linkUrl);
  if (mode === "live") return Boolean(liveState && canSubmitLiveRoomDraft(liveState, title));
  return title.trim().length > 0;
}

export function canSubmitLiveRoomDraft(liveState: LiveComposerState, title: string): boolean {
  if (!title.trim()) return false;
  if (liveState.scheduleForLater && !isValidLiveScheduleAt(liveState.scheduleAt)) return false;
  if (liveState.roomKind === "duet" && !liveState.guestUserId?.trim()) return false;
  if (liveState.setlistItems.length === 0) return false;
  if (liveState.setlistItems.some((item) => !item.titleText.trim())) return false;
  if (liveState.accessMode !== "paid") return true;
  return liveState.performerAllocations.reduce((sum, allocation) => sum + allocation.sharePct, 0) === 100;
}

export function isValidLiveScheduleAt(scheduleAt: string | undefined): boolean {
  const value = scheduleAt?.trim();
  if (!value) return false;
  return Number.isFinite(Date.parse(value));
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
