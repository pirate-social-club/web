const FALLBACK_DIGIT_COUNT = 6;
const MAX_HANDLE_LABEL_LENGTH = 30;

export function normalizeRedditHandleBase(value: string): string {
  const normalized = value
    .trim()
    .replace(/^u\//iu, "")
    .replace(/\.pirate$/iu, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");

  return normalized || "reddit";
}

export function generateRedditFallbackHandle(
  redditUsername: string,
  random: () => number = Math.random,
): string {
  const base = normalizeRedditHandleBase(redditUsername);
  const maxBaseLength = MAX_HANDLE_LABEL_LENGTH - FALLBACK_DIGIT_COUNT - 1;
  const trimmedBase = base.slice(0, maxBaseLength).replace(/-$/u, "") || "reddit";
  const digits = Math.floor(random() * 1_000_000).toString().padStart(FALLBACK_DIGIT_COUNT, "0");

  return `${trimmedBase}-${digits}`;
}
